// Ejecuta TODOS los escenarios documentados contra los servicios reales. Cada escenario es una prueba.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TODOS, ejecutarUno } from '../lib/escenarios.mjs';

for (const e of TODOS) {
  test(`${e.id} · ${e.nombre}`, () => {
    const r = ejecutarUno(e);
    if (!r.ok) console.error(`   ✗ ${e.id}: ${r.error}`);
    assert.equal(r.ok, true, r.error || 'falló');
    assert.ok(r.pasos.length > 0, 'el escenario no registró verificaciones');
  });
}
