// test/local-server.js
// Standalone zero-dependency local development server
// Emulates Netlify Functions and serves static frontend assets at http://localhost:8888

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8888;
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. API Route: Emulate Netlify Functions at /api/<module> or /.netlify/functions/<module>
  if (pathname.startsWith('/api/') || pathname.startsWith('/.netlify/functions/')) {
    const fnName = pathname.replace('/api/', '').replace('/.netlify/functions/', '').split('/')[0];
    const fnPath = path.join(ROOT, 'netlify', 'functions', `${fnName}.js`);

    if (!fs.existsSync(fnPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: `Function '${fnName}' not found.` }));
      return;
    }

    // Collect request body
    let bodyBuffers = [];
    req.on('data', chunk => bodyBuffers.push(chunk));
    req.on('end', async () => {
      const rawBody = Buffer.concat(bodyBuffers).toString();

      // Synthesize Netlify event object
      const event = {
        path: pathname,
        httpMethod: req.method,
        headers: req.headers,
        queryStringParameters: parsedUrl.query || {},
        body: rawBody
      };

      try {
        // Clear require cache for fast dev iteration
        delete require.cache[require.resolve(fnPath)];
        const fnModule = require(fnPath);

        const response = await fnModule.handler(event, {});
        const statusCode = response.statusCode || 200;
        const headers = response.headers || { 'Content-Type': 'application/json' };

        res.writeHead(statusCode, headers);
        res.end(response.body);
      } catch (err) {
        console.error(`[Server Error] Execution failed for ${fnName}:`, err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Internal Server Error: ' + err.message }));
      }
    });
    return;
  }

  // 2. Static File Serving
  let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);

  // Security check: ensure within ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    // SPA fallback: return index.html for unknown HTML paths
    filePath = path.join(ROOT, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading ' + pathname);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n===============================================================`);
  console.log(` AI Business Intelligence System - Local Development Server`);
  console.log(` Running at: http://localhost:${PORT}`);
  console.log(` Functions available at: http://localhost:${PORT}/api/<module>`);
  console.log(` Press Ctrl+C to terminate server.`);
  console.log(`===============================================================\n`);
});
