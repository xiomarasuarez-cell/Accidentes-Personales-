// Prueba E2E de la INTERFAZ REAL: Chrome headless + CDP. Hace clic en botones de la SPA y verifica el efecto en el backend.
// Uso: node tests/ui-e2e.mjs [urlBase]   (el servidor debe estar corriendo)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:4300';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), 'demo-ap-chrome-'));
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1500,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const resultados = []; let fallas = 0; const erroresJs = [];
const ok = (txt, cond, det = '') => { resultados.push({ txt, ok: !!cond, det }); if (!cond) fallas++; console.log(`${cond ? '✔' : '✖'} ${txt}${cond ? '' : '  → ' + det}`); };

async function conectar() {
  for (let i = 0; i < 40; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); const pg = t.find(x => x.type === 'page'); if (pg) return pg.webSocketDebuggerUrl; } catch {} await sleep(250); }
  throw new Error('No se pudo conectar con Chrome');
}
const ws = new WebSocket(await conectar()); await new Promise(r => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') erroresJs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
const cdp = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'error evaluando'); return r.result?.result?.value; };
const esperar = async (expr, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(150); } return false; };
const ir = async hash => { await ev(`location.hash='${hash}'`); await sleep(150); await esperar(`(()=>{const v=document.querySelector('#view');return v && v.querySelector('h1, .card') && !/^Cargando/.test(v.innerText.trim())})()`, 15000); await sleep(300); };
const texto = () => ev(`document.querySelector('#view').innerText`);
const clickTexto = (sel, txt) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent.trim().includes(${JSON.stringify(txt)})&&!x.disabled);if(!e)return false;e.click();return true})()`);
const modalAbierto = () => ev(`!!document.querySelector('.backdrop')`);
const setCampo = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.value=${JSON.stringify(v)};e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));return true})()`);
const api = async (path, user = 'u-admin', method = 'GET', body) => (await fetch(BASE + '/api' + path, { method, headers: { 'Content-Type': 'application/json', 'X-Demo-User': user }, body: body ? JSON.stringify(body) : undefined })).json();
const usar = async u => { await ev(`localStorage.setItem('demoUser','${u}')`); await ev('location.reload()'); await sleep(900); await esperar(`document.querySelector('#top select')`); };

try {
  await cdp('Runtime.enable'); await cdp('Page.enable'); await cdp('Page.navigate', { url: BASE + '/' }); await sleep(1200);
  await api('/seed', 'u-admin', 'POST');
  await ev(`localStorage.clear()`); await ev('location.reload()'); await sleep(1000); await esperar(`document.querySelector('#top select')`);

  // 1. Todas las rutas renderizan sin error
  const pols = await api('/polizas'); const A = pols.find(p => p.estructura === 'Nominada' && p.producto.includes('Colectivo')); const rcs = await api('/recibos'); const sols = await api('/solicitudes');
  for (const [hash, esperado] of [['#/', 'Accidentes Personales'], ['#/solicitudes', 'Solicitudes de póliza'], [`#/solicitud/${sols[0].id}`, 'SOL-'], ['#/polizas', 'Pólizas emitidas'], [`#/poliza/${A.id}`, `Póliza ${A.numero}`], [`#/poliza/${A.id}/movimientos`, 'Movimientos'], [`#/poliza/${A.id}/facturacion`, 'Cronograma'], ['#/novedades', 'Histórico de novedades'], ['#/facturacion', 'Todas las facturas'], [`#/facturacion/${A.id}`, 'Facturar'], ['#/recibos', 'Recibos y recaudo'], [`#/recibo/${rcs[0].id}`, 'Desprendible de cliente'], ['#/autorizaciones', 'Autorizaciones'], ['#/auditoria', 'Auditoría'], ['#/integraciones', 'Integraciones simuladas'], ['#/escenarios', 'Escenarios ejecutables'], ['#/trazabilidad', 'Matriz de reglas'], ['#/config', 'Parámetros de negocio']]) {
    await ir(hash); const t = await texto(); ok(`Ruta ${hash} se muestra`, t.includes(esperado) && !t.includes('Error al mostrar la vista'), t.slice(0, 120));
  }

  // 2. Novedad por la UI: cambio de sucursal
  await usar('u-novedades'); await ir(`#/poliza/${A.id}`);
  const antes = (await api(`/polizas/${A.id}`)).movimientos.length;
  await ev(`(()=>{const s=document.querySelector('select[aria-label="Novedades"]');s.value='sucursal';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await esperar('document.querySelector(".backdrop")');
  ok('Se abre el modal «Cambio de sucursal»', await modalAbierto());
  await ev(`(()=>{const s=document.querySelector('.modal select');const o=[...s.options].find(x=>x.value==='Cali'||x.value==='Bogotá');s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await clickTexto('.modal footer .btn', 'Guardar'); await sleep(900);
  const desp = await api(`/polizas/${A.id}`); ok('El cambio de sucursal se persiste (movimiento nuevo + carátula nueva versión)', desp.movimientos.length === antes + 1 && desp.caratulas.length >= 2, `mov ${antes}→${desp.movimientos.length}`);

  // 3. Error de negocio mostrado en la UI: intermediario no habilitado (Barranquilla)
  await ir(`#/poliza/${A.id}`); await ev(`(()=>{const s=document.querySelector('select[aria-label="Novedades"]');s.value='sucursal';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await esperar('document.querySelector(".backdrop")');
  await ev(`(()=>{const s=document.querySelector('.modal select');s.value='Barranquilla';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await clickTexto('.modal footer .btn', 'Guardar'); await esperar(`[...document.querySelectorAll('.backdrop')].length>1`);
  const t3 = await ev(`[...document.querySelectorAll('.modal')].map(m=>m.innerText).join('|')`); ok('La UI muestra el rechazo «intermediario no disponible para esta sucursal»', /intermediario no se encuentra disponible/i.test(t3), t3.slice(0, 200));
  await ev(`document.querySelectorAll('.backdrop').forEach(b=>b.remove())`);

  // 4. Facturación por la UI: validar y facturar el siguiente período
  await usar('u-emision'); await ir(`#/facturacion/${A.id}`); const fAntes = (await api(`/facturas?polizaId=${A.id}`)).length;
  await clickTexto('button', 'Validar antes de facturar'); await esperar(`document.querySelector('#view .note.ok, #view .note.bad')`); const tv = await texto(); ok('Pre-validación mostrada', /Validación correcta/.test(tv), tv.slice(-200));
  await clickTexto('button', 'Facturar'); await sleep(1500); const fDesp = (await api(`/facturas?polizaId=${A.id}`)).length; ok('Facturar genera 5 facturas (una por asegurado)', fDesp === fAntes + 5, `${fAntes}→${fDesp}`);

  // 5. Pago por la UI sobre un recibo pendiente
  await usar('u-novedades'); const pend = (await api(`/recibos?polizaId=${A.id}&estado=PENDIENTE`))[0]; await ir(`#/recibo/${pend.id}`);
  await setCampo('#view input[type=number]', '4000'); await clickTexto('button', 'Registrar pago'); await sleep(1200); const rc2 = await api(`/recibos/${pend.id}`); ok('El pago parcial deja el recibo en PARCIAL', rc2.estado === 'PARCIAL' && rc2.pagado === 4000, JSON.stringify({ e: rc2.estado, p: rc2.pagado }));

  // 6. Estudio técnico por la UI: autorizar política y emitir
  await usar('u-suscriptor-inter'); const D = (await api('/solicitudes')).find(s => s.politicasPendientes && s.tomador.includes('Carlos')); await ir(`#/solicitud/${D.id}`);
  await clickTexto('.step', 'Estudio técnico'); await sleep(400); await clickTexto('#view .btn', 'Autorizar'); await esperar('document.querySelector(".backdrop")'); await clickTexto('.modal footer .btn', 'Autorizar'); await sleep(1000);
  const sD = await api(`/solicitudes/${D.id}`); ok('Política autorizada desde la UI', sD.politicas.every(p => p.estado === 'Autorizada'), JSON.stringify(sD.politicas.map(p => p.estado)));
  await clickTexto('.step', 'Resumen y emisión'); await sleep(400); await usar('u-emision'); await ir(`#/solicitud/${D.id}`); await clickTexto('.step', 'Resumen y emisión'); await sleep(300); await clickTexto('#view .btn', 'Emitir póliza'); await sleep(1500);
  const sD2 = await api(`/solicitudes/${D.id}`); ok('La solicitud se emite desde la UI y genera póliza', sD2.estado === 'EMITIDA' && !!sD2.polizaId, sD2.estado); ok('La UI navega a la nueva póliza', (await ev('location.hash')).includes('/poliza/'), await ev('location.hash'));

  // 7. Nueva solicitud desde la UI
  await usar('u-suscriptor-avanz'); await ir('#/solicitudes'); await clickTexto('button', 'Nueva solicitud'); await esperar('document.querySelector(".backdrop")');
  await ev(`(()=>{const s=document.querySelector('.modal select');s.value='AP_INDIVIDUAL';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await clickTexto('.modal footer .btn', 'Crear solicitud'); await sleep(1200);
  const h7 = await ev('location.hash'); ok('Se crea una solicitud y se abre su formulario', /#\/solicitud\/SOL-/.test(h7), h7); await clickTexto('#view .btn', 'Guardar y continuar'); await sleep(900);
  const idNueva = h7.split('/').pop(); const sN = await api(`/solicitudes/${idNueva}`); ok('«Guardar y continuar» valida y guarda la sección Datos generales', sN.historial.some(e => /Datos generales|generales/.test(e.evento) && /validada/.test(e.evento)), JSON.stringify(sN.historial.map(e => e.evento)));

  // 7b. Editor de amparos: tabla y editor coinciden y el amparo no se puede cambiar al editar
  await ir(`#/solicitud/${idNueva}`); await clickTexto('.step', 'roducto'); await sleep(400);
  await ev(`(()=>{const s=document.querySelector('#view select');s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(400);
  await clickTexto('#view button', 'Agregar plan'); await sleep(300); await clickTexto('#view button', 'Agregar amparo'); await esperar('document.querySelector(".modal select[data-path=cod]")');
  await ev(`(()=>{const s=document.querySelector('.modal select[data-path=cod]');s.value='714';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await clickTexto('.modal footer .btn', 'Guardar amparo'); await sleep(400);
  const fila = await ev(`document.querySelector('#view table tbody tr').children[1].textContent.trim()`);
  await clickTexto('#view table button', 'Editar'); await esperar('document.querySelector(".modal select[data-path=cod]")');
  const ed = await ev(`(()=>{const s=document.querySelector('.modal select[data-path=cod]');return {txt:s.selectedOptions[0].textContent,dis:s.disabled}})()`);
  ok('El amparo de la tabla coincide con el del editor', ed.txt === `714 · ${fila}`, `${fila} | ${ed.txt}`); ok('Al editar, el código del amparo no se puede cambiar', ed.dis === true);
  await ev(`document.querySelectorAll('.backdrop').forEach(b=>b.remove())`);
  const rst = await fetch(BASE + '/api/reset', { method: 'POST' }); ok('Reiniciar la demo sin usuario está bloqueado (401)', rst.status === 401, rst.status);

  // 8. Escenarios desde la UI
  await ir('#/escenarios'); await clickTexto('#view .btn', 'Ejecutar todos'); await esperar(`/6[0-9] de 6[0-9] escenarios correctos|escenarios correctos/.test(document.querySelector('#toasts')?.innerText||'')`, 60000); const tE = await ev(`document.querySelector('#toasts')?.innerText`);
  ok('Todos los escenarios se ejecutan desde la UI y pasan', /(\d+) de \1 escenarios correctos/.test(tE || ''), tE);

  ok('No hubo excepciones JavaScript en el navegador', erroresJs.length === 0, erroresJs.join(' | ').slice(0, 300));
  const shot = await cdp('Page.captureScreenshot', { format: 'png' }); mkdirSync('docs/evidencia', { recursive: true }); writeFileSync('docs/evidencia/ui_escenarios.png', Buffer.from(shot.result.data, 'base64'));
} catch (e) { ok('El recorrido E2E terminó sin excepciones', false, e.message); }
finally { ws.close(); chrome.kill(); await sleep(300); try { rmSync(profile, { recursive: true, force: true }); } catch {} }
writeFileSync('docs/evidencia/ui_e2e_resultado.json', JSON.stringify({ fecha: new Date().toISOString(), base: BASE, total: resultados.length, fallas, resultados }, null, 2));
console.log(`\n${resultados.length - fallas}/${resultados.length} verificaciones de UI correctas`); process.exit(fallas ? 1 : 0);
