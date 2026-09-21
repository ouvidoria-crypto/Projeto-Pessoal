import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Determine directory to serve: dist/ if built, otherwise root
const staticDir = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
  ? path.join(__dirname, 'dist')
  : __dirname;

app.use(express.static(staticDir));

// Fallback for uppercase /BOLSONARO.png to bolsonaro.png
app.get('/BOLSONARO.png', (req, res) => {
  const filePath = path.join(staticDir, 'bolsonaro.png');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.status(404).end();
});

// Single page / static fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
