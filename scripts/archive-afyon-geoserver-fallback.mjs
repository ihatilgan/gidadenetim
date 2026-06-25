#!/usr/bin/env node

import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

const BASE_URL = 'https://geoserver.afyon.bel.tr/geoserver/mosk/ows';
const OUT_DIR = path.resolve('data/afyon-kent-rehberi-archive');
const MAX_FEATURES = process.env.MAX_FEATURES || '1000000';
const DELAY_MS = Number(process.env.DELAY_MS || 500);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);

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

async function fetchToFile(requestUrl, filePath, attempt = 1) {
  const response = await fetch(requestUrl, {
    headers: {
      'User-Agent': 'gidadenetim-data-archive/1.0',
      'Accept': 'application/json,*/*',
    },
    signal: AbortSignal.timeout(300000),
  }).catch(async (error) => {
    if (attempt < MAX_RETRIES) {
      await sleep(1000 * attempt);
      return fetchToFile(requestUrl, filePath, attempt + 1);
    }
    throw error;
  });

  if (!response.ok) {
    if (attempt < MAX_RETRIES) {
      await sleep(1000 * attempt);
      return fetchToFile(requestUrl, filePath, attempt + 1);
    }
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(filePath));
}

async function fileHead(filePath, length = 800) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const stream = createReadStream(filePath, { start: 0, end: length - 1 });
    stream.on('data', (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size >= length) stream.destroy();
    });
    stream.on('error', reject);
    stream.on('close', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const reportPath = path.join(OUT_DIR, 'archive-report.json');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const failed = report.filter((entry) => entry.status === 'failed');
  const fallbackReport = [];

  for (const entry of failed) {
    const layerName = entry.layerName;
    const layerDir = path.join(OUT_DIR, 'layers', safeName(layerName));
    await mkdir(layerDir, { recursive: true });

    const outputFile = path.join(layerDir, 'fallback-wfs1.geojson');
    if (existsSync(outputFile)) {
      const info = await stat(outputFile);
      if (info.size > 1000) {
        const head = await fileHead(outputFile);
        if (!/ExceptionReport|ServiceException/i.test(head)) {
          console.log(`[${layerName}] fallback cached ${info.size} bytes`);
          fallbackReport.push({ layerName, status: 'cached', bytes: info.size });
          continue;
        }
      }
    }

    await sleep(DELAY_MS);
    const requestUrl = url({
      service: 'WFS',
      version: '1.0.0',
      request: 'GetFeature',
      typeName: layerName,
      maxFeatures: MAX_FEATURES,
      outputFormat: 'JSON',
    });

    console.log(`[${layerName}] fallback WFS 1.0`);
    try {
      await fetchToFile(requestUrl, outputFile);
      const info = await stat(outputFile);
      const head = await fileHead(outputFile);
      if (/ExceptionReport|ServiceException/i.test(head)) {
        const failedEntry = {
          layerName,
          status: 'failed',
          bytes: info.size,
          error: head.replace(/\s+/g, ' ').slice(0, 1000),
        };
        fallbackReport.push(failedEntry);
        console.error(`[${layerName}] fallback failed`);
      } else {
        fallbackReport.push({ layerName, status: 'ok', bytes: info.size });
        console.log(`[${layerName}] fallback ok ${info.size} bytes`);
      }
    } catch (error) {
      fallbackReport.push({
        layerName,
        status: 'failed',
        error: String(error.message || error),
      });
      console.error(`[${layerName}] fallback error: ${error.message || error}`);
    }
  }

  await writeJson(path.join(OUT_DIR, 'fallback-report.json'), fallbackReport);
  console.log(`\nFallback complete: ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
