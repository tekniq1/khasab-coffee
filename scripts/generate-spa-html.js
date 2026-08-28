import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.join(__dirname, '..', 'dist', 'client');
const assetsDir = path.join(clientDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.log('No assets directory found in dist/client');
  process.exit(0);
}

const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.startsWith('styles-') && f.endsWith('.css')) || files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js')) || files.find(f => f.endsWith('.js'));

const cssTag = cssFile ? `    <link rel="stylesheet" href="/assets/${cssFile}" />` : '';
const jsTag = jsFile ? `    <script type="module" src="/assets/${jsFile}"></script>` : '';

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>خصب | متجر القهوة المختصة</title>
    <meta name="description" content="خصب — محاصيل بن مختصة وآلات وأدوات قهوة احترافية بتوصيل سريع." />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;700;800&family=Tajawal:wght@400;500;700;800&display=swap" />
${cssTag}
  </head>
  <body>
    <div id="root"></div>
${jsTag}
  </body>
</html>`;

fs.writeFileSync(path.join(clientDir, 'index.html'), html, 'utf-8');
const redSrc = path.join(__dirname, '..', 'public', '_redirects');
if (fs.existsSync(redSrc)) {
  fs.copyFileSync(redSrc, path.join(clientDir, '_redirects'));
}
console.log('✅ SPA html generated successfully with CSS:', cssFile, 'and JS:', jsFile);
