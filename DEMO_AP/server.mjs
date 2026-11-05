// Servidor HTTP de la demo (sin dependencias). Sirve la SPA (public/) y la API REST (/api).
import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCore } from './lib/core.mjs';
import { buildRoutes } from './lib/api.mjs';
import { createEscenarios } from './lib/escenarios.mjs';
import { USUARIOS } from './lib/catalog.mjs';
import { BizError } from './lib/util.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const paginaAcceso = msg => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Accidentes Personales · Acceso</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F5F7F9;color:#2C3948;font:15px Helvetica,Arial,sans-serif}form{background:#fff;border:1px solid #E1E5EA;border-radius:12px;padding:28px;width:min(340px,90vw);display:grid;gap:12px}h1{font-size:18px;margin:0}input{padding:10px;border:1px solid #E1E5EA;border-radius:8px;font:inherit}button{padding:10px;border:0;border-radius:8px;background:#FF7500;color:#fff;font:inherit;font-weight:700;cursor:pointer}p{margin:0;color:#D63C3C;font-size:13px}</style></head><body><form method="post" action="/acceso"><h1>Accidentes Personales</h1><span>Ingrese la clave de acceso.</span>${msg ? `<p>${msg}</p>` : ''}<input type="password" name="clave" placeholder="Clave" autofocus required><button>Entrar</button></form></body></html>`;

export function startServer({ port = Number(process.env.PORT) || 4300, dbFile = process.env.DB_FILE || join(__dir, 'data', 'demo.db'), host = process.env.HOST || '127.0.0.1' } = {}) {
  mkdirSync(dirname(dbFile), { recursive: true });
  const core = createCore(dbFile);
  const escenarios = createEscenarios(dbFile);
  const routes = buildRoutes(core, escenarios);
  const pub = join(__dir, 'public');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'); const send = (status, obj, type = 'application/json; charset=utf-8') => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(typeof obj === 'string' || Buffer.isBuffer(obj) ? obj : JSON.stringify(obj)); };
    try {
      // Clave de acceso opcional (variable DEMO_KEY): protege TODA la demo cuando se publica en Internet.
      if (process.env.DEMO_KEY) {
        const esperado = createHash('sha256').update('demo-ap|' + process.env.DEMO_KEY).digest('hex');
        const cookie = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith('demo_acceso='))?.slice(12);
        if (url.pathname === '/acceso' && req.method === 'POST') {
          let raw = ''; for await (const c of req) { raw += c; if (raw.length > 2000) break; }
          const dada = new URLSearchParams(raw).get('clave') || '';
          const a = createHash('sha256').update(dada).digest(), b = createHash('sha256').update(process.env.DEMO_KEY).digest();
          if (timingSafeEqual(a, b)) { res.writeHead(302, { 'Set-Cookie': `demo_acceso=${esperado}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`, Location: '/' }); return res.end(); }
          res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(paginaAcceso('Clave incorrecta.'));
        }
        if (cookie !== esperado) {
          if (url.pathname.startsWith('/api/')) return send(401, { error: { message: 'Acceso restringido: ingrese la clave de la demo.', code: 'SIN_ACCESO' } });
          res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(paginaAcceso(''));
        }
      }
      if (url.pathname.startsWith('/api/')) {
        const r = routes.find(x => x.method === req.method && x.re.test(url.pathname));
        if (!r) return send(404, { error: { message: `Ruta inexistente: ${req.method} ${url.pathname}`, code: 'NO_ENCONTRADO' } });
        const params = { ...url.pathname.match(r.re).groups }; Object.keys(params).forEach(k => { params[k] = decodeURIComponent(params[k]); });
        let body = {}; if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) { const chunks = []; for await (const c of req) chunks.push(c); const raw = Buffer.concat(chunks).toString('utf8'); if (raw) { try { body = JSON.parse(raw); } catch { throw new BizError('El cuerpo de la petición no es JSON válido.', { status: 400, code: 'JSON_INVALIDO' }); } } }
        const uid = req.headers['x-demo-user']; const user = uid ? USUARIOS.find(u => u.id === uid) : null;
        const publicas = ['/api/meta', '/api/escenarios', '/api/dashboard', '/api/bitacora', '/api/escenarios/ejecutar-todos'];
        if (!user && !publicas.includes(url.pathname) && !url.pathname.startsWith('/api/escenarios/') && req.method !== 'GET') throw new BizError('Seleccione un usuario de demo (cabecera X-Demo-User).', { status: 401, code: 'NO_AUTENTICADO' });
        const out = await r.handler({ core, user, params, query: Object.fromEntries(url.searchParams), body });
        return send(200, out ?? {});
      }
      let p = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, ''); if (!p || p.endsWith('/')) p = join(p, 'index.html');
      const file = join(pub, p);
      if (!file.startsWith(pub) || !existsSync(file) || !statSync(file).isFile()) { return send(200, readFileSync(join(pub, 'index.html')), MIME['.html']); }   // SPA fallback
      return send(200, readFileSync(file), MIME[extname(file)] || 'application/octet-stream');
    } catch (e) {
      if (e instanceof BizError) return send(e.status, { error: { message: e.message, code: e.code, detalle: e.detalle } });
      console.error(e); return send(500, { error: { message: 'Error interno de la demo. Intente de nuevo; si persiste, revise el registro del servidor.', code: 'ERROR_INTERNO' } });
    }
  });
  return new Promise(resolve => server.listen(port, host, () => resolve({ server, core, port: server.address().port, close: () => new Promise(r => server.close(() => { core.store.close(); r(); })) })));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer().then(({ port }) => console.log(`Demo Accidentes Personales – Core Positiva (INDEPENDIENTE del ambiente productivo)\n→ http://127.0.0.1:${port}\nBase de datos local: data/demo.db`));
}
