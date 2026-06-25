#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = 'https://geoserver.afyon.bel.tr/geoserver/mosk/ows';
const OUT_DIR = path.resolve('data/afyon-kent-rehberi-archive');
const PAGE_SIZE = Number(process.env.PAGE_SIZE || 5000);
const DELAY_MS = Number(process.env.DELAY_MS || 350);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);
const MODE = process.argv.includes('--all') ? 'all' : 'address';

const ADDRESS_LAYERS = new Set([
  'mosk:MaksMahalle',
  'mosk:MaksYolOrtaHat',
  'mosk:MaksNumarataj',
  'mosk:MaksYapi',
  'mosk:MaksDigerYapi',
  'mosk:TapuMahalleler',
  'mosk:TapuParseller',
  'mosk:TapuYapilar',
  'mosk:BelediyeSinir',
  'mosk:MucavirSinir',
  'mosk:KoyYerlesikAlan',
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function url(params) {
  const u = new URL(BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    u.searchParams.set(key, value);
  }
  return u;
}

function safeName(layerName) {
  return layerName.replace(/^mosk:/, '').replace(/[^a-zA-Z0-9_.-]+/g, '_');
}

async function fetchText(requestUrl, attempt = 1) {
  const response = await fetch(requestUrl, {
    headers: {
      'User-Agent': 'gidadenetim-data-archive/1.0',
      'Accept': '*/*',
    },
    signal: AbortSignal.timeout(120000),
  }).catch(async (error) => {
    if (attempt < MAX_RETRIES) {
      await sleep(1000 * attempt);
      return fetchText(requestUrl, attempt + 1);
    }
    throw error;
  });

  if (typeof response === 'string') return response;
  if (!response.ok) {
    if (attempt < MAX_RETRIES) {
      await sleep(1000 * attempt);
      return fetchText(requestUrl, attempt + 1);
    }
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${requestUrl}`);
  }
  return response.text();
}

async function fetchJson(requestUrl, attempt = 1) {
  const text = await fetchText(requestUrl, attempt);
  if (/ServiceException|ExceptionReport/i.test(text.slice(0, 500))) {
    throw new Error(text.slice(0, 1000).replace(/\s+/g, ' '));
  }
  return JSON.parse(text);
}

function parseLayerNames(capabilitiesXml) {
  const names = Array.from(capabilitiesXml.matchAll(/<Name>(mosk:[^<]+)<\/Name>/g), (m) => m[1]);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'tr'));
}

function parseFeatureFields(describeXml) {
  return Array.from(describeXml.matchAll(/<xsd:element[^>]+name="([^"]+)"[^>]+type="([^"]+)"/g), (m) => ({
    name: m[1],
    type: m[2],
  }));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  await mkdir(path.join(OUT_DIR, 'metadata'), { recursive: true });
  await mkdir(path.join(OUT_DIR, 'layers'), { recursive: true });

  const capabilitiesUrl = url({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetCapabilities',
  });
  const capabilitiesXml = await fetchText(capabilitiesUrl);
  await writeFile(path.join(OUT_DIR, 'metadata', 'GetCapabilities.xml'), capabilitiesXml);

  const allLayers = parseLayerNames(capabilitiesXml);
  const selectedLayers = MODE === 'all' ? allLayers : allLayers.filter((name) => ADDRESS_LAYERS.has(name));
  await writeJson(path.join(OUT_DIR, 'metadata', 'layers.json'), {
    createdAt: new Date().toISOString(),
    source: BASE_URL,
    mode: MODE,
    pageSize: PAGE_SIZE,
    allLayerCount: allLayers.length,
    selectedLayerCount: selectedLayers.length,
    selectedLayers,
  });

  const archiveReport = [];

  for (const layerName of selectedLayers) {
    const layerSafe = safeName(layerName);
    const layerDir = path.join(OUT_DIR, 'layers', layerSafe);
    const chunksDir = path.join(layerDir, 'chunks');
    await mkdir(chunksDir, { recursive: true });

    console.log(`\n[${layerName}] schema`);
    const describeUrl = url({
      service: 'WFS',
      version: '2.0.0',
      request: 'DescribeFeatureType',
      typeName: layerName,
    });
    const describeXml = await fetchText(describeUrl);
    await writeFile(path.join(layerDir, 'DescribeFeatureType.xml'), describeXml);
    await writeJson(path.join(layerDir, 'fields.json'), parseFeatureFields(describeXml));

    console.log(`[${layerName}] first page`);
    const firstUrl = url({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: layerName,
      count: String(PAGE_SIZE),
      startIndex: '0',
      outputFormat: 'application/json',
      srsName: 'EPSG:4326',
    });

    let firstPage;
    try {
      firstPage = await fetchJson(firstUrl);
    } catch (error) {
      const failed = {
        layerName,
        status: 'failed',
        error: String(error.message || error),
      };
      archiveReport.push(failed);
      await writeJson(path.join(layerDir, 'manifest.json'), failed);
      console.error(`[${layerName}] failed: ${failed.error}`);
      continue;
    }

    const total = Number(firstPage.totalFeatures ?? firstPage.numberMatched ?? firstPage.features?.length ?? 0);
    let returned = Number(firstPage.numberReturned ?? firstPage.features?.length ?? 0);
    await writeJson(path.join(chunksDir, '000000.geojson'), firstPage);
    console.log(`[${layerName}] total=${total} returned=${returned}`);

    for (let startIndex = PAGE_SIZE; startIndex < total; startIndex += PAGE_SIZE) {
      const chunkFile = path.join(chunksDir, `${String(startIndex).padStart(6, '0')}.geojson`);
      if (existsSync(chunkFile)) {
        try {
          const cached = JSON.parse(await readFile(chunkFile, 'utf8'));
          returned += Number(cached.numberReturned ?? cached.features?.length ?? 0);
          console.log(`[${layerName}] cached ${startIndex}`);
          continue;
        } catch {
          // Re-download corrupt or partial chunks.
        }
      }

      await sleep(DELAY_MS);
      const pageUrl = url({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: layerName,
        count: String(PAGE_SIZE),
        startIndex: String(startIndex),
        outputFormat: 'application/json',
        srsName: 'EPSG:4326',
      });
      const page = await fetchJson(pageUrl);
      const count = Number(page.numberReturned ?? page.features?.length ?? 0);
      returned += count;
      await writeJson(chunkFile, page);
      console.log(`[${layerName}] chunk ${startIndex} count=${count}`);
    }

    const manifest = {
      layerName,
      safeName: layerSafe,
      status: 'ok',
      totalFeatures: total,
      downloadedFeatures: returned,
      chunkSize: PAGE_SIZE,
      downloadedAt: new Date().toISOString(),
    };
    archiveReport.push(manifest);
    await writeJson(path.join(layerDir, 'manifest.json'), manifest);
  }

  await writeJson(path.join(OUT_DIR, 'archive-report.json'), archiveReport);
  console.log(`\nArchive complete: ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
