import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
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
const updated = html.replace(/import\('\.\/app\.bundle(?:\.[a-f0-9]{12})?\.js'\)/,
  `import('./${filename}')`);
if (updated === html && !html.includes(`import('./${filename}')`)) {
  throw new Error('Missing VL4 startup import in index.html');
}
await writeFile(indexPath, updated);
console.log(`Built ${filename}`);
