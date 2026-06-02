/**
 * Projectory 이벤트 관리 데모 - 백엔드 서버 (외부 의존성 없음)
 *
 * 저장소(영구 보존):
 *  - 환경변수 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 가 있으면 Upstash Redis(REST)에 저장
 *  - 없으면 로컬 data.json 파일에 저장(서버 재시작 시 초기화될 수 있음)
 *
 * 기능
 *  - 정적 파일 서빙 (event-list.html, event-edit.html, styles.css 등)
 *  - 화면 설명/댓글 저장 (여러 사용자 공유)
 *
 * 실행:  node server.js   (기본 포트 3000, PORT 환경변수로 변경)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const PORT = process.env.PORT || 3000;

// ---- Upstash Redis (REST) 설정 ----
const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
const UP_TOK = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_UPSTASH = !!(UP_URL && UP_TOK);
const KV_KEY = 'projectory_event:data';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const EMPTY = { descriptions: {}, comments: {} };

// ---- 저장소 추상화 ----
async function kvGet() {
  const r = await fetch(UP_URL + '/get/' + encodeURIComponent(KV_KEY), {
    headers: { Authorization: 'Bearer ' + UP_TOK }
  });
  if (!r.ok) throw new Error('upstash get ' + r.status);
  const j = await r.json();
  if (j.result == null) return null;
  try { return JSON.parse(j.result); } catch (e) { return null; }
}
async function kvSet(obj) {
  const r = await fetch(UP_URL + '/set/' + encodeURIComponent(KV_KEY), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + UP_TOK },
    body: JSON.stringify(obj)
  });
  if (!r.ok) throw new Error('upstash set ' + r.status);
}

async function loadData() {
  if (USE_UPSTASH) {
    try {
      const d = await kvGet();
      return d || { descriptions: {}, comments: {} };
    } catch (e) {
      console.error('Upstash load 실패, 빈 데이터로 시작:', e.message);
      return { descriptions: {}, comments: {} };
    }
  }
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return { descriptions: {}, comments: {} }; }
}
async function persist() {
  if (USE_UPSTASH) {
    try { await kvSet(data); } catch (e) { console.error('Upstash save 실패:', e.message); }
    return;
  }
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) { /* noop */ }
}

let data = { descriptions: {}, comments: {} };

// ---- 유틸 ----
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

// ---- 라우팅 ----
const server = http.createServer(async function (req, res) {
  const u = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(u.pathname);

  if (p === '/api/state' && req.method === 'GET') {
    return sendJson(res, 200, data);
  }
  if (p.indexOf('/api/descriptions/') === 0 && req.method === 'PUT') {
    const key = p.slice('/api/descriptions/'.length);
    const body = await readBody(req);
    data.descriptions[key] = String(body.value == null ? '' : body.value).slice(0, 20000);
    await persist();
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
      await persist();
      return sendJson(res, 200, cmt);
    }
    if (req.method === 'DELETE') {
      const parts = rest.split('/');
      const key = parts[0], id = parts[1];
      data.comments[key] = (data.comments[key] || []).filter(function (c) { return c.id !== id; });
      await persist();
      return sendJson(res, 200, { ok: true });
    }
  }

  // 정적 파일
  let file = (p === '/' ? '/event-list.html' : p);
  const fp = path.join(ROOT, path.normalize(file));
  if (fp.indexOf(ROOT) !== 0) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, function (err, buf) {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(buf);
  });
});

// ---- 시작 ----
(async function init() {
  data = await loadData();
  if (!data.descriptions) data.descriptions = {};
  if (!data.comments) data.comments = {};
  server.listen(PORT, '0.0.0.0', function () {
    console.log('Projectory 데모 서버 실행: 0.0.0.0:' + PORT + '  (저장소: ' + (USE_UPSTASH ? 'Upstash Redis' : 'data.json 파일') + ')');
  });
})();
