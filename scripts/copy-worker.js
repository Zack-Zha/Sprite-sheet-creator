import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '..', 'node_modules', 'gif.js.optimized', 'dist', 'gif.worker.js');
const destDir = resolve(__dirname, '..', 'public');
const dest = resolve(destDir, 'gif.worker.js');

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

if (!existsSync(src)) {
  console.error('ERROR: gif.worker.js not found at:', src);
  process.exit(1);
}

console.log('Source:', src);
console.log('Dest:', dest);

try {
  copyFileSync(src, dest);
  console.log('Successfully copied gif.worker.js to public/');
} catch (err) {
  console.error('Failed to copy:', err.message);
  process.exit(1);
}
