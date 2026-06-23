#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appPath = path.join(root, 'app.html');
const sourcePath = path.join(root, 'src', 'app.source.html');

function readScriptBlock(html, type) {
  const open = `<script type="${type}">`;
  const start = html.indexOf(open);
  if (start < 0) throw new Error(`Missing script block: ${type}`);
  const bodyStart = start + open.length;
  const end = html.indexOf('</script>', bodyStart);
  if (end < 0) throw new Error(`Unclosed script block: ${type}`);
  return {
    body: html.slice(bodyStart, end).trim(),
    bodyStart,
    end,
  };
}

function escapeScriptEnd(value) {
  return value.replace(/<\/script/gi, '<\\/script');
}

function inlineLocalScripts(html) {
  return html.replace(
    /<script\s+data-inline-src="([^"]+)"\s*><\/script>/g,
    (_match, relativeFile) => {
      const scriptPath = path.join(root, relativeFile);
      const code = fs.readFileSync(scriptPath, 'utf8');
      return `<script>\n${code}\n</script>`;
    }
  );
}

const appHtml = fs.readFileSync(appPath, 'utf8');
const sourceHtml = inlineLocalScripts(fs.readFileSync(sourcePath, 'utf8'));
const templateBlock = readScriptBlock(appHtml, '__bundler/template');
const template = JSON.parse(templateBlock.body);

if (!template.entry || !template.pages || !template.pages[template.entry]) {
  throw new Error('Unexpected bundle template shape');
}

template.pages[template.entry] = sourceHtml;

const packedTemplate = escapeScriptEnd(JSON.stringify(template));
const nextAppHtml =
  appHtml.slice(0, templateBlock.bodyStart) +
  '\n' +
  packedTemplate +
  '\n  ' +
  appHtml.slice(templateBlock.end);

fs.writeFileSync(appPath, nextAppHtml);
console.log(`Packed ${path.relative(root, sourcePath)} -> ${path.relative(root, appPath)}`);
