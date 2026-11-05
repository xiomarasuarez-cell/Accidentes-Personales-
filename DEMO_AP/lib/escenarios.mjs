// Ejecutor de escenarios: cada escenario corre en una BASE TEMPORAL AISLADA (no contamina los datos de la demo).
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createCore } from './core.mjs';
import { crearHarness, Falla } from './esc/harness.mjs';
import { emision } from './esc/emision.mjs';
import { admin } from './esc/admin.mjs';
import { facturacion } from './esc/facturacion.mjs';
import { REGLAS, PENDIENTES_DOC } from './reglas.mjs';
import { CONTRADICCIONES, BRECHAS, SUPUESTOS, DECISIONES } from './brechas.mjs';

export const TODOS = [...emision, ...admin, ...facturacion];
export const meta = e => { const { run, ...m } = e; return m; };

export function ejecutarUno(e, { reloj = '2026-01-01' } = {}) {
  const file = join(tmpdir(), `demo-ap-esc-${randomUUID()}.db`);
  const core = createCore(file); const H = crearHarness(core); H.clock(reloj); const t0 = Date.now();
  let ok = true, error = null, resultado = null;
  try { resultado = e.run(H) ?? null; } catch (err) {
    ok = false; error = err instanceof Falla ? err.message : `${err.name}: ${err.message}${err.detalle ? ' ' + JSON.stringify(err.detalle).slice(0, 300) : ''}`;
    if (!(err instanceof Falla)) H.pasos.push({ texto: 'Error inesperado en el escenario', ok: false, detalle: error });
  }
  try { core.store.close(); } catch {} for (const s of ['', '-wal', '-shm']) { try { rmSync(file + s); } catch {} }
  return { id: e.id, nombre: e.nombre, ok, error, pasos: H.pasos, ms: Date.now() - t0 };
}

export function createEscenarios() {
  return {
    catalogo: () => TODOS.map(meta),
    ejecutar: id => { const e = TODOS.find(x => x.id === id); if (!e) throw Object.assign(new Error('Escenario inexistente'), {}); return ejecutarUno(e); },
    ejecutarTodos: () => { const r = TODOS.map(e => ejecutarUno(e)); return { total: r.length, exitosos: r.filter(x => x.ok).length, fallidos: r.filter(x => !x.ok).length, resultados: r }; },
    reglas: () => REGLAS,
    trazabilidad: () => {
      const porRegla = Object.fromEntries(REGLAS.map(r => [r.id, TODOS.filter(e => (e.reglas || []).includes(r.id)).map(e => e.id)]));
      const hus = {}; for (const e of TODOS) for (const h of e.hu || []) (hus[h] ||= new Set()).add(e.id);
      return { reglas: REGLAS.map(r => ({ ...r, pruebas: porRegla[r.id] })), sinPrueba: REGLAS.filter(r => !porRegla[r.id].length).map(r => r.id), pendientesDoc: PENDIENTES_DOC, contradicciones: CONTRADICCIONES, brechas: BRECHAS, supuestos: SUPUESTOS, decisiones: DECISIONES, huEscenarios: Object.fromEntries(Object.entries(hus).map(([k, v]) => [k, [...v]])) };
    },
  };
}
