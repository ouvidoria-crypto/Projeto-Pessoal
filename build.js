import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const ignoredNames = new Set(['dist', 'node_modules', '.git', '.gitattributes', 'build.js', 'server.js', 'package.json', 'package-lock.json', 'metadata.json', '.env.example']);

const entries = fs.readdirSync(__dirname);

for (const entry of entries) {
  if (ignoredNames.has(entry) || entry.startsWith('.')) {
    continue;
  }
  const src = path.join(__dirname, entry);
  const dest = path.join(distDir, entry);
  const stat = fs.statSync(src);
  if (stat.isFile()) {
    fs.copyFileSync(src, dest);
  }
}

// Ensure bolsonaro.png is also available as BOLSONARO.png in dist
const bolsonaroSrc = path.join(__dirname, 'bolsonaro.png');
if (fs.existsSync(bolsonaroSrc)) {
  fs.copyFileSync(bolsonaroSrc, path.join(distDir, 'BOLSONARO.png'));
}

console.log('Build completed: static files copied to dist/');
