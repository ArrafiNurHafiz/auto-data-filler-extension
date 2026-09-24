import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3456;
const demoHtmlPath = path.resolve(__dirname, 'public/demo_test_page.html');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/demo' || req.url?.startsWith('/demo_test_page.html')) {
    fs.readFile(demoHtmlPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading demo page');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 DEMO LOCALHOST SERVER BERJALAN:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
