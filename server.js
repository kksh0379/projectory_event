/**
 * Projectory 이벤트 관리 데모 - 간단 백엔드 서버 (외부 의존성 없음)
 *
 * 기능
 *  - 정적 파일 서빙 (event-list.html, event-edit.html, styles.css 등)
 *  - 화면 설명/댓글을 data.json 파일에 저장 (여러 사용자 공유)
 *
 * 실행:  node server.js   (기본 포트 3000, PORT 환경변수로 변경 가능)
 * 접속:  http://localhost:3000/
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { descriptions: {}, comments: {} };
  }
}
function saveData(d) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); } catch (e) { /* noop */ }
}
let data = loadData();
if (!data.descriptions) data.descriptions = {};
if (!data.comments) data.comments = {};

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise(function (resolve) {
    var b = '';
    req.on('data', function (c) { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', function () { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { resolve({}); } });
  });
}
function shortTime() {
  var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
  return (d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const server = http.createServer(async function (req, res) {
  const u = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(u.pathname);

  // ---- API ----
  if (p === '/api/state' && req.method === 'GET') {
    return sendJson(res, 200, data);
  }
  if (p.indexOf('/api/descriptions/') === 0 && req.method === 'PUT') {
    const key = p.slice('/api/descriptions/'.length);
    const body = await readBody(req);
    data.descriptions[key] = String(body.value == null ? '' : body.value).slice(0, 20000);
    saveData(data);
    return sendJson(res, 200, { ok: true });
  }
  if (p.indexOf('/api/comments/') === 0) {
    const rest = p.slice('/api/comments/'.length);
    if (req.method === 'POST') {
      const key = rest;
      const body = await readBody(req);
      const text = String(body.text == null ? '' : body.text).trim().slice(0, 2000);
      if (!text) return sendJson(res, 400, { error: 'empty' });
      const cmt = {
        id: genId(),
        author: (String(body.author == null ? '' : body.author).trim() || '익명').slice(0, 40),
        text: text,
        time: shortTime()
      };
      (data.comments[key] = data.comments[key] || []).push(cmt);
      saveData(data);
      return sendJson(res, 200, cmt);
    }
    if (req.method === 'DELETE') {
      const parts = rest.split('/');
      const key = parts[0], id = parts[1];
      data.comments[key] = (data.comments[key] || []).filter(function (c) { return c.id !== id; });
      saveData(data);
      return sendJson(res, 200, { ok: true });
    }
  }

  // ---- 정적 파일 ----
  let file = (p === '/' ? '/event-list.html' : p);
  const fp = path.join(ROOT, path.normalize(file));
  if (fp.indexOf(ROOT) !== 0) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, function (err, buf) {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(buf);
  });
});

server.listen(PORT, function () {
  console.log('Projectory 데모 서버 실행: http://localhost:' + PORT + '/');
});
