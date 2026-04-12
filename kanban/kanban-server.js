const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const DIR = __dirname;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

const send = (res, code, body, extra = {}) => {
  const headers = { ...CORS, ...extra };
  if (typeof body === 'string') headers['Content-Type'] = headers['Content-Type'] || 'text/plain';
  res.writeHead(code, headers);
  res.end(body);
};

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');

  if (req.method === 'GET' && req.url === '/') {
    const html = fs.readFileSync(path.join(DIR, 'kanban.html'), 'utf8');
    return send(res, 200, html, { 'Content-Type': 'text/html' });
  }

  if (req.method === 'GET' && req.url === '/kanban') {
    const filePath = path.join(DIR, 'kanban.json');
    const mtime = fs.statSync(filePath).mtime;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data._lastModified = mtime.toISOString();
    return send(res, 200, JSON.stringify(data, null, 2), {
      'Content-Type': 'application/json',
      'Last-Modified': mtime.toUTCString(),
    });
  }

  if (req.method === 'POST' && req.url === '/kanban') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const filePath = path.join(DIR, 'kanban.json');
        const data = JSON.parse(body);
        const currentMtime = fs.statSync(filePath).mtime;
        if (data._lastModified && new Date(data._lastModified).getTime() < currentMtime.getTime()) {
          return send(res, 409, JSON.stringify({ error: 'conflict', message: 'Board was modified externally. Please refresh.' }), { 'Content-Type': 'application/json' });
        }
        delete data._lastModified;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        const newMtime = fs.statSync(filePath).mtime;
        send(res, 200, JSON.stringify({ ok: true, lastModified: newMtime.toISOString() }), { 'Content-Type': 'application/json' });
      } catch (e) {
        send(res, 400, JSON.stringify({ error: e.message }), { 'Content-Type': 'application/json' });
      }
    });
    return;
  }

  send(res, 404, JSON.stringify({ error: 'Not found' }), { 'Content-Type': 'application/json' });
}).listen(PORT, () => console.log(`Kanban board running at http://localhost:${PORT}`));
