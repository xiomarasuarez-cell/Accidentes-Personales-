// QA de backend/API/seguridad/robustez contra un servidor PROPIO (puerto libre, base temporal). No toca la demo en ejecución.
// Uso: node --disable-warning=ExperimentalWarning tests/qa-api.mjs
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { rmSync, writeFileSync, mkdirSync } from 'node:fs'; import { randomUUID } from 'node:crypto';
import { startServer } from '../server.mjs'; import { crearHarness } from '../lib/esc/harness.mjs';

const file = join(tmpdir(), `qa-ap-${randomUUID()}.db`); const srv = await startServer({ port: 0, dbFile: file });
const B = `http://127.0.0.1:${srv.port}`; const H = crearHarness(srv.core); H.clock('2026-01-01');
const call = async (m, p, { u = 'u-admin', body, raw } = {}) => {
  const headers = { ...(raw === undefined ? { 'Content-Type': 'application/json' } : {}), ...(u ? { 'X-Demo-User': u } : {}) };
  const r = await fetch(B + p, { method: m, headers, body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { s: r.status, j };
};
const out = []; let fallas = 0;
const T = async (id, mod, nombre, fn) => {
  try { const r = await fn(); const ok = r === true; out.push({ id, mod, nombre, ok, det: ok ? '' : String(r?.det ?? r) }); if (!ok) fallas++; console.log(`${ok ? '✔' : '✖'} ${id} ${nombre}${ok ? '' : ' → ' + (r?.det ?? r)}`); }
  catch (e) { fallas++; out.push({ id, mod, nombre, ok: false, det: 'EXCEPCIÓN ' + e.message }); console.log(`✖ ${id} ${nombre} → EXCEPCIÓN ${e.message}`); }
};
const ok = (cond, det) => cond === true || { det };
const noStack = j => !/\.(mjs|js):\d+|node:internal|\bat\s+\w+/i.test(JSON.stringify(j));
const facturas = async pid => (await call('GET', `/api/facturas?polizaId=${pid}`)).j;
const claves = fs => fs.map(f => `${f.periodo?.idx}|${f.destinatario?.numDoc}|${f.tipo}`);
const anular = { tipoAnulacion: 'Solicitud del tomador', fechaAnulacion: '2026-01-01', razon: 'Cliente ya no desea el seguro' };

// ---------- Seguridad y acceso
await T('QA-S01', 'Seguridad', 'POST sin usuario → 401', async () => { const r = await call('POST', '/api/solicitudes', { u: null, body: {} }); return ok(r.s === 401, r.s); });
await T('QA-S02', 'Seguridad', 'Usuario inexistente en la cabecera → 401', async () => { const r = await call('POST', '/api/solicitudes', { u: 'hacker', body: {} }); return ok(r.s === 401, r.s); });
await T('QA-S03', 'Seguridad', 'Reiniciar la demo sin usuario → 401', async () => { const r = await call('POST', '/api/reset', { u: null }); return ok(r.s === 401, r.s); });
await T('QA-S04', 'Seguridad', 'Reiniciar la demo con un rol no administrador → 403', async () => { const r = await call('POST', '/api/reset', { u: 'u-emision' }); return ok(r.s === 403, r.s); });
await T('QA-S05', 'Seguridad', 'Recargar datos de ejemplo con datos existentes y rol no administrador → 403', async () => { H.emitirPoliza(); const r = await call('POST', '/api/seed', { u: 'u-emision' }); return ok(r.s === 403, r.s); });
await T('QA-S06', 'Seguridad', 'Cambiar parámetros / simulación / reloj sin ser administrador → 403', async () => {
  const r = await Promise.all([call('PUT', '/api/params', { u: 'u-emision', body: { smmlv: 1 } }), call('POST', '/api/sim', { u: 'u-emision', body: { servicio: 'DIAN_OPEN', modo: 'falla' } }), call('POST', '/api/clock', { u: 'u-emision', body: { fecha: '2030-01-01' } })]);
  return ok(r.every(x => x.s === 403), r.map(x => x.s).join());
});
await T('QA-S07', 'Seguridad', 'JSON mal formado → 400 sin detalles técnicos', async () => { const r = await call('POST', '/api/solicitudes', { raw: '{malo' }); return ok(r.s === 400 && noStack(r.j), `${r.s} ${JSON.stringify(r.j)}`); });
await T('QA-S08', 'Seguridad', 'Ruta inexistente → 404 en JSON', async () => { const r = await call('GET', '/api/nada'); return ok(r.s === 404 && !!r.j?.error?.code, r.s); });
await T('QA-S09', 'Seguridad', 'Path traversal en estáticos no expone código fuente', async () => {
  const t = await (await fetch(B + '/..%2f..%2fserver.mjs')).text(); const t2 = await (await fetch(B + '/%2e%2e/lib/rules.mjs')).text(); const t3 = await (await fetch(B + '/..%5c..%5cserver.mjs')).text();
  return ok(!t.includes('startServer') && !t2.includes('calcAmparo') && !t3.includes('startServer'), 'expuso fuente');
});
await T('QA-S10', 'Seguridad', 'Entradas hostiles en rutas no producen 500 con información técnica', async () => {
  const rs = await Promise.all([call('PUT', '/api/solicitudes/SOL-000001/seccion/__proto__', { body: { a: 1 } }), call('GET', '/api/polizas/%E0%A4%A'), call('GET', "/api/solicitudes/'; DROP TABLE docs;--"), call('POST', '/api/recibos/RC-1/pago', { body: { valor: {} } })]);
  return ok(rs.every(r => noStack(r.j)), JSON.stringify(rs.map(r => [r.s, r.j?.error?.message])));
});
await T('QA-S11', 'Seguridad', 'Prototype pollution en el cuerpo no contamina Object.prototype', async () => { await call('PUT', '/api/params', { body: JSON.parse('{"__proto__":{"polluted":1},"smmlv":1423500}') }); return ok(({}).polluted === undefined, 'contaminado'); });

// ---------- Emisión: validaciones en backend
await T('QA-E01', 'Emisión', 'Crear solicitud con producto inexistente → 400', async () => { const r = await call('POST', '/api/solicitudes', { u: 'u-suscriptor-avanz', body: { productoId: 'NO_EXISTE' } }); return ok(r.s === 400, `${r.s} ${JSON.stringify(r.j).slice(0, 150)}`); });
await T('QA-E02', 'Emisión', 'Radicar una solicitud vacía se rechaza con la lista de pendientes', async () => {
  const c = await call('POST', '/api/solicitudes', { u: 'u-suscriptor-avanz', body: { productoId: 'AP_COLECTIVO' } }); if (c.s !== 200) return { det: JSON.stringify(c.j).slice(0, 200) };
  const r = await call('POST', `/api/solicitudes/${c.j.id}/radicar`, { u: 'u-suscriptor-avanz' }); const s = (await call('GET', `/api/solicitudes/${c.j.id}`)).j;
  return ok(r.s >= 400 && r.s < 500 && s.estado === 'BORRADOR', `${r.s} estado=${s.estado}`);
});
await T('QA-E03', 'Emisión', 'Emitir una solicitud en borrador se rechaza y no crea póliza', async () => {
  const c = await call('POST', '/api/solicitudes', { u: 'u-suscriptor-avanz', body: { productoId: 'AP_COLECTIVO' } }); const n0 = (await call('GET', '/api/polizas')).j.length;
  const r = await call('POST', `/api/solicitudes/${c.j.id}/emitir`, { u: 'u-emision' }); const n1 = (await call('GET', '/api/polizas')).j.length;
  return ok(r.s >= 400 && r.s < 500 && n0 === n1, `${r.s} pólizas ${n0}→${n1}`);
});
await T('QA-E04', 'Emisión', 'Primas negativas, texto, nulas o absurdas son rechazadas por el backend (no solo por el front)', async () => {
  const c = await call('POST', '/api/solicitudes', { u: 'u-suscriptor-avanz', body: { productoId: 'AP_COLECTIVO' } }); const aceptadas = [];
  for (const v of [-5, 'abc', null, 1e20]) {
    const r = await call('PUT', `/api/solicitudes/${c.j.id}/seccion/productos`, { u: 'u-suscriptor-avanz', body: { continuar: true, data: { producto: { productoId: 'AP_COLECTIVO' }, planes: [{ id: 'P1', nombre: 'X', primaPorAsegurado: v, amparos: [{ cod: '402', tipoAmparo: 'Básico', tipoValorAsegurado: 'SUMA_INFORMADA', valorAseguradoIndividual: 1000, edadMinIngreso: 18, edadMaxIngreso: 65, edadMaxPermanencia: 70 }] }] } } });
    if (r.s !== 400) aceptadas.push(`${String(v)}→${r.s}`);
  }
  return ok(aceptadas.length === 0, 'aceptó: ' + aceptadas.join());
});
const P = H.emitirPoliza();
await T('QA-E05', 'Emisión', 'Emitir dos veces la misma solicitud no genera una segunda póliza', async () => {
  const n0 = (await call('GET', '/api/polizas')).j.length; const r = await call('POST', `/api/solicitudes/${P.solicitudId}/emitir`, { u: 'u-emision' }); const n1 = (await call('GET', '/api/polizas')).j.length;
  return ok(r.s >= 400 && n0 === n1, `${r.s} pólizas ${n0}→${n1}`);
});
await T('QA-E06', 'Emisión', 'Emitir con rol sin permiso (usuario tercero) → 403', async () => { const r = await call('POST', `/api/solicitudes/${P.solicitudId}/emitir`, { u: 'u-tercero' }); return ok(r.s === 403, r.s); });

// ---------- Facturación
await T('QA-F01', 'Facturación', 'Facturar el período 1 genera factura + recibo por asegurado (5)', async () => {
  const r = await call('POST', `/api/polizas/${P.id}/facturar`, { u: 'u-emision', body: { modo: 'SIN_NOVEDADES' } }); const f = await facturas(P.id);
  return ok(r.s === 200 && f.length === 5, `${r.s} facturas=${f.length} ${JSON.stringify(r.j).slice(0, 160)}`);
});
await T('QA-F02', 'Facturación', 'Facturar otra vez el mismo período no duplica facturas', async () => {
  await call('POST', `/api/polizas/${P.id}/facturar`, { u: 'u-emision', body: { modo: 'SIN_NOVEDADES' } }); const f = await facturas(P.id); const k = claves(f);
  return ok(new Set(k).size === k.length, `facturas=${f.length} únicas=${new Set(k).size}`);
});
await T('QA-F03', 'Facturación', 'Cinco solicitudes de facturar en paralelo no generan duplicados', async () => {
  const Q = H.emitirPoliza(); await Promise.all([1, 2, 3, 4, 5].map(() => call('POST', `/api/polizas/${Q.id}/facturar`, { u: 'u-emision', body: { modo: 'SIN_NOVEDADES' } })));
  const f = await facturas(Q.id); const k = claves(f); const per = [...new Set(f.map(x => x.periodo?.idx))].sort(); return ok(new Set(k).size === k.length && per.length === 5, `facturas=${f.length} únicas=${new Set(k).size} períodos=${per}`);
});
await T('QA-F04', 'Facturación', 'Pagos mayores al saldo, negativos, cero o no numéricos se rechazan', async () => {
  const rc = (await call('GET', `/api/recibos?polizaId=${P.id}&estado=PENDIENTE`)).j[0]; const aceptados = [];
  for (const v of [rc.saldo + 1, -10, 0, 'x']) { const r = await call('POST', `/api/recibos/${rc.id}/pago`, { u: 'u-novedades', body: { valor: v, medio: 'Corresponsal bancario' } }); if (r.s === 200) aceptados.push(v); }
  return ok(aceptados.length === 0, 'aceptó ' + aceptados.join());
});
await T('QA-F05', 'Facturación', 'Pago exacto legaliza el recibo y un pago posterior se rechaza', async () => {
  const rc = (await call('GET', `/api/recibos?polizaId=${P.id}&estado=PENDIENTE`)).j[0]; const a = await call('POST', `/api/recibos/${rc.id}/pago`, { u: 'u-novedades', body: { valor: rc.saldo, medio: 'Corresponsal bancario' } });
  const r = (await call('GET', `/api/recibos/${rc.id}`)).j; const b = await call('POST', `/api/recibos/${rc.id}/pago`, { u: 'u-novedades', body: { valor: 1, medio: 'Corresponsal bancario' } });
  return ok(a.s === 200 && r.estado === 'LEGALIZADO' && b.s >= 400, `${a.s} ${r.estado} ${b.s}`);
});
await T('QA-F06', 'Facturación', 'DIAN en falla: facturar es atómico (nada se factura) y el reproceso funciona', async () => {
  const Q = H.emitirPoliza(); await call('POST', '/api/sim', { body: { servicio: 'DIAN_OPEN', modo: 'falla' } });
  const r = await call('POST', `/api/polizas/${Q.id}/facturar`, { u: 'u-emision', body: { modo: 'SIN_NOVEDADES' } }); const f0 = (await facturas(Q.id)).length;
  await call('POST', '/api/sim', { body: { servicio: 'DIAN_OPEN', modo: 'ok' } }); const r2 = await call('POST', `/api/polizas/${Q.id}/facturar`, { u: 'u-emision', body: { modo: 'SIN_NOVEDADES' } }); const f1 = (await facturas(Q.id)).length;
  return ok(r.s >= 400 && f0 === 0 && r2.s === 200 && f1 === 5, `falla=${r.s} tras falla=${f0} reproceso=${r2.s} final=${f1}`);
});
await T('QA-F07', 'Facturación', 'Facturar con un usuario sin permiso → 403', async () => { const r = await call('POST', `/api/polizas/${P.id}/facturar`, { u: 'u-tercero', body: {} }); return ok(r.s === 403, r.s); });

// ---------- Movimientos
await T('QA-M01', 'Movimientos', 'Novedad con usuario sin permiso → 403 y la póliza queda intacta', async () => {
  const r = await call('POST', `/api/polizas/${P.id}/novedades/sucursal`, { u: 'u-tercero', body: { sucursal: 'Cali' } }); const d = (await call('GET', `/api/polizas/${P.id}`)).j;
  return ok(r.s === 403 && d.movimientos.length === 1, `${r.s} movimientos=${d.movimientos.length}`);
});
await T('QA-M02', 'Movimientos', 'Tipo de novedad inexistente → 4xx', async () => { const r = await call('POST', `/api/polizas/${P.id}/novedades/inventada`, { u: 'u-novedades', body: {} }); return ok(r.s >= 400 && r.s < 500, r.s); });
await T('QA-M03', 'Movimientos', 'Anular una póliza facturada: queda ANULADA y una segunda anulación se rechaza', async () => {
  const Q = H.emitirPoliza(); await call('POST', `/api/polizas/${Q.id}/facturar`, { u: 'u-emision', body: { modo: 'SIN_NOVEDADES' } });
  const a = await call('POST', `/api/polizas/${Q.id}/novedades/anular`, { u: 'u-suscriptor-avanz', body: anular }); const d = (await call('GET', `/api/polizas/${Q.id}`)).j;
  const b = await call('POST', `/api/polizas/${Q.id}/novedades/anular`, { u: 'u-suscriptor-avanz', body: anular });
  return ok(a.s === 200 && d.estado === 'ANULADA' && b.s >= 400, `anular=${a.s} ${JSON.stringify(a.j).slice(0, 200)} estado=${d.estado} segunda=${b.s}`);
});
await T('QA-M04', 'Movimientos', 'Una póliza anulada no admite facturar ni nuevas novedades', async () => {
  const Q = (await call('GET', '/api/polizas')).j.find(p => p.estado === 'ANULADA'); if (!Q) return { det: 'no hay póliza anulada (falló QA-M03)' };
  const a = await call('POST', `/api/polizas/${Q.id}/facturar`, { u: 'u-emision', body: { modo: 'SIN_NOVEDADES' } }); const b = await call('POST', `/api/polizas/${Q.id}/novedades/sucursal`, { u: 'u-novedades', body: { sucursal: 'Cali' } });
  return ok(a.s >= 400 && b.s >= 400, `facturar=${a.s} sucursal=${b.s}`);
});

// ---------- Integridad
await T('QA-I01', 'Integridad', 'Cada recibo pertenece a una factura existente y total = pagado + saldo', async () => {
  const rc = (await call('GET', '/api/recibos')).j; const ids = new Set((await call('GET', '/api/facturas')).j.map(f => f.id));
  const malos = rc.filter(r => !ids.has(r.facturaId) || (!['ANULADO', 'CRUZADO', 'PENDIENTE_REEMBOLSO', 'REEMBOLSADO'].includes(r.estado) && Math.abs(r.total - (r.pagado + r.saldo)) > 0.01));
  return ok(malos.length === 0, malos.slice(0, 3).map(r => `${r.id}:${r.estado}`).join());
});
await T('QA-I02', 'Integridad', 'La auditoría registra las acciones críticas', async () => { const a = (await call('GET', '/api/auditoria')).j; const n = Array.isArray(a) ? a.length : a.items?.length; return ok(n > 0, 'sin auditoría'); });
await T('QA-X01', 'Entrada', 'Texto con HTML/script no provoca error del servidor', async () => {
  const c = await call('POST', '/api/solicitudes', { u: 'u-suscriptor-avanz', body: { productoId: 'AP_COLECTIVO' } });
  const r = await call('PUT', `/api/solicitudes/${c.j.id}/seccion/generales`, { u: 'u-suscriptor-avanz', body: { data: { observaciones: '<img src=x onerror=alert(1)>' } } });
  return ok(r.s === 200, r.s);
});

await srv.close(); for (const s of ['', '-wal', '-shm']) { try { rmSync(file + s); } catch {} }
mkdirSync('docs/evidencia', { recursive: true });
writeFileSync('docs/evidencia/qa_api_resultado.json', JSON.stringify({ fecha: new Date().toISOString(), total: out.length, fallas, resultados: out }, null, 2));
console.log(`\n${out.length - fallas}/${out.length} pruebas de API/seguridad correctas`); process.exit(fallas ? 1 : 0);
