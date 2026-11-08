import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const materialInputs=['paperwork/worksheet.py','paperwork/source.js','paperwork/client.js','i18n.js','inquiry-content.js','rubric.js','reports.js','model.js','analysis.js','history-figure.js','assets/alexander-fleming-petri-dish-penicillin.jpg'];
const materialBytes=await Promise.all(materialInputs.map(n=>readFile(resolve(root,n))));
const materialFingerprint=createHash('sha256').update(Buffer.concat(materialBytes)).digest('hex');
await writeFile(resolve(root,'paperwork/fingerprint.js'),`export const PAPER_FINGERPRINT='${materialFingerprint}';\n`);
await build({ absWorkingDir: root, entryPoints: ['app.js'], bundle: true,
  platform: 'browser', format: 'esm', outfile: 'app.bundle.js', sourcemap: true });
const bundlePath = resolve(root, 'app.bundle.js');
const bundle = (await readFile(bundlePath, 'utf8')).replace(/[ \t]+$/gm, '');
const version = createHash('sha256').update(bundle).digest('hex').slice(0, 12);
const filename = `app.bundle.${version}.js`;
await writeFile(bundlePath, bundle);
await writeFile(resolve(root, filename), bundle);
const indexPath = resolve(root, 'index.html');
const html = await readFile(indexPath, 'utf8');
let updated = html.replace(/import\('\.\/app\.bundle(?:\.[a-f0-9]{12})?\.js'\)/,
  `import('./${filename}')`);
if (updated === html && !html.includes(`import('./${filename}')`)) {
  throw new Error('Missing VL4 startup import in index.html');
}
for (const stylesheet of ['styles.css', 'bench.css']) {
  const cssVersion = createHash('sha256').update(await readFile(resolve(root, stylesheet))).digest('hex').slice(0, 12);
  const link = new RegExp(`href="${stylesheet.replace('.', '\\.')}(?:\\?v=[a-f0-9]{12})?"`);
  updated = updated.replace(link, `href="${stylesheet}?v=${cssVersion}"`);
}
await writeFile(indexPath, updated);
console.log(`Built ${filename}`);
