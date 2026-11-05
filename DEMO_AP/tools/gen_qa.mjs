// Genera docs/15_informe_qa.md con los resultados REALES guardados en docs/evidencia.
import { readFileSync, writeFileSync } from 'node:fs';
import { createEscenarios } from '../lib/escenarios.mjs';

const J = f => JSON.parse(readFileSync(`docs/evidencia/${f}`, 'utf8'));
const api = J('qa_api_resultado.json'), ui = J('ui_e2e_resultado.json');
const nodeOut = readFileSync('docs/evidencia/node_test_salida.txt', 'utf8');
const esc = Number(nodeOut.match(/ℹ pass (\d+)/)[1]), escTot = Number(nodeOut.match(/ℹ tests (\d+)/)[1]);
const tz = createEscenarios().trazabilidad(); const conPrueba = tz.reglas.length - tz.sinPrueba.length;
const tabla = (c, r) => `| ${c.join(' | ')} |\n|${c.map(() => '---').join('|')}|\n${r.map(x => `| ${x.map(v => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`).join('\n')}\n`;
const tot = api.total + ui.total + escTot, okT = (api.total - api.fallas) + (ui.total - ui.fallas) + esc;

const D = [
  ['DEF-01', 'Seguridad', 'Alta', 'POST /api/reset y /api/seed borraban toda la base sin usuario ni permiso (cualquiera con el enlace podía vaciar la demo).', 'Las rutas figuraban como públicas y el handler no validaba rol.', 'lib/api.mjs, server.mjs', 'reset exige rol Administrador; seed exige Administrador si ya hay datos; ambas salen de la lista pública.', 'QA-S03/S04/S05 + UI «Reiniciar sin usuario → 401»', 'Validado'],
  ['DEF-02', 'Backend', 'Media', 'Guardar una sección sin «data» o con el nombre de sección __proto__ devolvía 500.', 'guardarSeccion no validaba el cuerpo y usaba SECCIONES[seccion] (hereda del prototipo); clone(undefined) lanzaba excepción.', 'lib/solicitudes.mjs, lib/util.mjs', 'Validación de cuerpo (400) y Object.hasOwn (404); clone tolera undefined.', 'QA-E04, QA-S10, QA-X01', 'Validado'],
  ['DEF-03', 'Emisión', 'Media', 'Se podía crear una solicitud con un producto inexistente.', 'Sin validación de productoId al crear.', 'lib/solicitudes.mjs', 'Rechazo 400 «Producto inexistente».', 'QA-E01', 'Validado'],
  ['DEF-04', 'Emisión', 'Media', 'Primas y valores asegurados absurdos (1e20) eran aceptados.', 'Sin cota numérica.', 'lib/rules.mjs, lib/brechas.mjs (A-06)', 'Límite técnico 1e12 (no es regla de negocio: supuesto A-06).', 'QA-E04', 'Validado'],
  ['DEF-05', 'Backend', 'Baja', 'Los errores 500 devolvían el mensaje interno de la excepción.', 'Concatenaba e.message en la respuesta.', 'server.mjs', 'Mensaje genérico; el detalle queda solo en el log del servidor.', 'QA-S07, QA-S10', 'Validado'],
  ['DEF-06', 'Frontend', 'Baja', 'Editor de amparos: el código del amparo se podía cambiar al editar (la fila de la tabla dejaba de coincidir con lo editado), un amparo inhabilitado salía en blanco y Valor asegurado/Prima mostraban «—» sin explicación.', 'Select sin disabled en la edición; el filtro excluía inhabilitados; sin texto para valores aún no calculados.', 'public/views/solicitud.js, public/views/amparo.js', 'Código bloqueado al editar (con indicación), inhabilitados visibles y rotulados, «Se calcula al guardar».', 'UI «tabla coincide con editor» y «código no editable»; 51 amparos recorridos añadir→editar sin diferencias', 'Validado'],
  ['DEF-07', 'Pruebas', 'Baja', 'La prueba de UI leía la pantalla mientras decía «Cargando…» (falla intermitente).', 'Espera insuficiente.', 'tests/ui-e2e.mjs', 'Espera hasta que el contenido deje de decir «Cargando».', '3 corridas consecutivas', 'Validado'],
];

writeFileSync('docs/15_informe_qa.md', `# 15 · Informe de QA (probar → corregir → regresión)

## 1. Resumen ejecutivo
Se ejecutaron **${tot} verificaciones reales** (${okT} correctas, ${tot - okT} con falla) en tres capas: escenarios de negocio sobre el backend (${esc}/${escTot}), API/seguridad/robustez (${api.total - api.fallas}/${api.total}) e interfaz real en Chrome (${ui.total - ui.fallas}/${ui.total}). Se encontraron **${D.length} defectos, todos corregidos y revalidados**; no quedan defectos críticos ni altos abiertos entre los detectados. **Esto no equivale a «sin defectos»:** hay alcance sin probar y funcionalidades no implementadas (secciones 9 y 10).

## 2. Alcance y método
Servidor propio y base temporal para la batería de API (no afecta la demo); Chrome headless controlado por CDP para la UI (Playwright no está instalado: se usó el protocolo de Chrome directamente). Cada corrección se validó con su caso y con la regresión completa.

## 3. Pruebas ejecutadas (resultado real)
${tabla(['Capa', 'Comando', 'Resultado'], [['Escenarios de negocio', 'node --test tests/escenarios.test.mjs', `${esc}/${escTot}`], ['API, seguridad y robustez', 'node tests/qa-api.mjs', `${api.total - api.fallas}/${api.total}`], ['Interfaz E2E real', 'node tests/ui-e2e.mjs', `${ui.total - ui.fallas}/${ui.total}`]])}
### Casos de API/seguridad
${tabla(['ID', 'Módulo', 'Caso', 'Resultado'], api.resultados.map(r => [r.id, r.mod, r.nombre, r.ok ? 'OK' : 'FALLA ' + r.det]))}
### Casos de interfaz
${tabla(['Verificación', 'Resultado'], ui.resultados.map(r => [r.txt, r.ok ? 'OK' : 'FALLA ' + r.det]))}

## 4. Matriz de defectos
${tabla(['ID', 'Módulo', 'Severidad', 'Defecto', 'Causa raíz', 'Archivo', 'Corrección', 'Evidencia', 'Estado'], D)}
**Reporte del usuario no reproducido:** «en un plan dice *amparo* y al editar parece otro amparo». Se recorrieron los 51 amparos del catálogo (agregar → editar) y el nombre siempre coincidió. Lo que sí podía confundir (código cambiable al editar, inhabilitados en blanco, valores «—») se corrigió (DEF-06). Falta el código del amparo concreto para confirmar si era ese caso.

## 5. Cobertura
- Reglas de negocio: **${conPrueba}/${tz.reglas.length}** con al menos un escenario automatizado (${(100 * conPrueba / tz.reglas.length).toFixed(0)} %). Sin escenario: ${tz.sinPrueba.join(', ') || 'ninguna'}.
- Verificaciones correctas: **${okT}/${tot}** (${(100 * okT / tot).toFixed(0)} %).
- La «cobertura funcional» frente a toda la documentación NO es 100 %: faltan HU y flujos (sección 10).

## 6. Regresión
Tras cada grupo de correcciones se repitieron las tres capas completas; el estado final es el de la sección 3.

## 7. Trazabilidad
Requerimiento → regla → escenario: docs/04 y docs/13. Defecto → corrección → prueba: sección 4.

## 8. Riesgos
- Las lecturas (GET) de la API no exigen usuario: cualquiera con la URL ve los datos. Aceptable solo con datos ficticios.
- La autenticación es una cabecera simulada (X-Demo-User); no hay sesiones ni contraseñas.
- Se pueden facturar períodos futuros sin límite de anticipación (cada llamada factura el siguiente período pendiente): **no hay regla documentada**; queda como brecha para el negocio.
- La base es SQLite de un solo proceso: no se probó concurrencia real multiproceso.

## 9. Sin probar
Navegadores distintos de Chrome, móvil/responsive, accesibilidad formal, carga, concurrencia multiproceso, seguridad más allá de lo listado (sin pruebas de penetración).

## 10. No implementado (brechas documentadas)
Prórroga, renovación, rehabilitación, reversión/anulación de movimiento, y las HU/documentos de docs/14.

## 11. Estado final
Apto para **demostración funcional controlada con datos ficticios** de emisión, administración, novedades implementadas y facturación. **No apto** para exponer en Internet sin una clave de acceso ni como sustituto del core.
`);
console.log('informe generado', tot, okT);
