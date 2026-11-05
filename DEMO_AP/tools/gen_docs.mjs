// Genera los entregables documentales desde los datos reales del código (reglas, escenarios, brechas, catálogos).
// Uso: node --disable-warning=ExperimentalWarning tools/gen_docs.mjs
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { TODOS, meta, createEscenarios } from '../lib/escenarios.mjs';
import { REGLAS, PENDIENTES_DOC } from '../lib/reglas.mjs';
import { CONTRADICCIONES, BRECHAS, SUPUESTOS, DECISIONES } from '../lib/brechas.mjs';
import { PRODUCTOS, POLITICAS, USUARIOS, PARAMS_DEFECTO, MOTIVOS_ANULACION } from '../lib/catalog.mjs';

mkdirSync('docs', { recursive: true });
const w = (f, s) => writeFileSync(`docs/${f}`, s.trimStart() + '\n');
const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const tabla = (cols, rows) => `| ${cols.join(' | ')} |\n|${cols.map(() => '---').join('|')}|\n${rows.map(r => `| ${r.map(esc).join(' | ')} |`).join('\n')}\n`;
const trz = createEscenarios().trazabilidad();
const M = TODOS.map(meta);
const salida = existsSync('docs/evidencia/node_test_salida.txt') ? readFileSync('docs/evidencia/node_test_salida.txt', 'utf8') : '';
const resumenTest = (salida.match(/ℹ tests \d+[\s\S]*?ℹ duration_ms [\d.]+/) || [''])[0];
const ui = existsSync('docs/evidencia/ui_e2e_resultado.json') ? JSON.parse(readFileSync('docs/evidencia/ui_e2e_resultado.json', 'utf8')) : null;

// 02 Inventario de documentación
w('02_inventario_documentacion.md', `
# 02 · Inventario de documentación analizada

**Fuente principal de verdad:** la documentación. **Google Drive** (https://drive.google.com/drive/folders/1JtVhG3xHxgNgxf5xzWRMAT66Dy3g4yce) **no fue accesible** (exige inicio de sesión): **no se simuló haberla leído** (brecha G-01).

## Documentos que SÍ se leyeron (carpeta del proyecto)
${tabla(['Documento', 'Uso en la demo'], [
  ['HU de Accidentes Personales (15 HU: 647, 577, 558, 446, 404, 387, 309, 300, 296, 294, 091, 077, 675, 728 y cuestionarios respondidos)', 'Reglas de emisión, administración y facturación (ver matriz de reglas)'],
  ['Cuadro_Comparativo_Vida_Grupo_AP_Colectivo.pdf', 'Diferencias VG vs AP Colectivo (parcial; ver G-xx)'],
  ['BASE_CONOCIMIENTO_PROCESO_EMISION_v3.md / _NOVEDADES.md / _COTIZACION.md', 'Contexto de procesos'],
  ['CATALOGOS_LISTAS_PARAMETRICAS.md', 'Catálogos (productos, amparos, tipos)'],
  ['ARQUITECTURA_01 SAD_POSITIVA_CORE_V4.1.docx', 'Arquitectura objetivo / restricciones'],
  ['Código existente (Backend QA: 15 microservicios; Frontend dev-web-front-core; BD 345 tablas)', 'Diagnóstico (doc 01)'],
])}

## Documentos que FALTAN (se piden explícitamente)
${tabla(['HU / documento', 'Tema', 'Tratamiento en la demo'], PENDIENTES_DOC)}
**Solicitud puntual:** descargar la carpeta de Drive como ZIP a la carpeta del proyecto, o compartirla con acceso de lector, e indicar si están aprobadas las HU listadas arriba y los catálogos Excel (amparos, tarifas, políticas).
`);

// 03 Flujo integral
w('03_flujo_integral.md', `
# 03 · Diagrama de flujo integral de Accidentes Personales

\`\`\`mermaid
flowchart TD
  subgraph A[A · Emisión]
    A1[Solicitud BORRADOR] --> A2[Secciones: datos generales, tomador, productos/amparos, asegurados, beneficiarios, intermediarios]
    A2 --> A3{Validaciones por sección}
    A3 -- error --> A2
    A3 -- ok --> A4[RADICADA · Registraduría / listas restrictivas / SGDEA / CRM simulados]
    A4 --> A5[EN_ESTUDIO · políticas P01–P08]
    A5 -- incumple --> A6[Autorización por nivel] --> A5
    A5 -- rechazo --> A7[RECHAZADA]
    A5 -- ok --> A8[EMITIDA · póliza VIGENTE · movimiento 1 · carátula v1]
  end
  subgraph B[B · Administración]
    A8 --> B1[Consulta · carátula · listado asegurados · certificado · histórico]
  end
  subgraph C[C · Movimientos]
    B1 --> C1[Sucursal · Comisión · Gastos · Tomador · Periodicidad · Planes · Beneficiarios · Inclusión/Retiro]
    C1 --> C2{¿Requiere autorización?}
    C2 -- sí --> C3[Autorización] --> C4
    C2 -- no --> C4[Nuevo movimiento + carátula versionada + ajuste de facturación]
    B1 --> C5[Anulación → nota crédito: cruce o reembolso]
  end
  subgraph D[D · Facturación]
    A8 --> D1[Cronograma por períodos] --> D2[Pre-validación DIAN]
    D2 -- faltantes --> D3[Bloquea y lista faltantes]
    D2 -- ok --> D4[Factura DIAN + recibo + SAP]
    D4 --> D5[Pago → PENDIENTE/PARCIAL/LEGALIZADO/EN_MORA]
    C4 --> D6[Ajuste / nota crédito] --> D5
  end
\`\`\`

El diagrama draw.io de HU del core está en \`../FLujo core_con_HU.drawio\`.
`);

// 04 Reglas
w('04_matriz_reglas.md', `
# 04 · Matriz de reglas de negocio

${REGLAS.length} reglas · ${REGLAS.filter(r => r.estado === 'Implementada').length} implementadas · ${REGLAS.filter(r => r.estado === 'Parcial').length} parciales · ${REGLAS.filter(r => r.estado === 'Pendiente').length} pendientes · ${trz.sinPrueba.length} sin escenario.

${tabla(['ID', 'Fuente', 'Regla', 'Estado', 'Dónde', 'Escenarios', 'Nota'], trz.reglas.map(r => [r.id, r.fuente, r.regla, r.estado, r.donde, r.pruebas.join(', ') || '—', r.nota]))}
${trz.sinPrueba.length ? `\n**Reglas sin escenario automatizado:** ${trz.sinPrueba.join(', ')}\n` : ''}
`);

// 05 Escenarios (12 atributos)
w('05_matriz_escenarios.md', `
# 05 · Matriz de escenarios (${M.length})

Cada escenario es ejecutable (\`POST /api/escenarios/{id}/ejecutar\` o pantalla *Escenarios*). Atributos: 1 ID · 2 Nombre · 3 Descripción · 4 Condiciones iniciales · 5 Datos de entrada · 6 Reglas · 7 Flujo · 8 Resultado esperado · 9 Estado final · 10 Impacto en póliza · 11 Impacto en facturación · 12 Mensajes/validaciones al usuario (más HU y tipo).

${M.map(e => `## ${e.id} · ${e.nombre}
- **Grupo / tipo / HU:** ${e.grupo} · ${e.tipo} · ${(e.hu || []).join(', ') || '—'}
- **Descripción:** ${e.descripcion || '—'}
- **Condiciones iniciales:** ${e.condiciones || '—'}
- **Datos de entrada:** ${e.entrada || '—'}
- **Reglas:** ${(e.reglas || []).join(', ') || '—'}
- **Flujo:** ${(e.flujo || []).map((x, i) => `${i + 1}) ${x}`).join(' ') || '—'}
- **Resultado esperado:** ${e.esperado || '—'}
- **Estado final:** ${e.estadoFinal || '—'}
- **Impacto póliza:** ${e.impactoPoliza || '—'}
- **Impacto facturación:** ${e.impactoFacturacion || '—'}
- **Mensajes:** ${e.mensajes || '—'}
`).join('\n')}`);

// 06 Modelo de dominio
w('06_modelo_dominio.md', `
# 06 · Modelo de dominio

\`\`\`mermaid
erDiagram
  SOLICITUD ||--o{ POLITICA_EVAL : evalua
  SOLICITUD ||--o| POLIZA : emite
  POLIZA ||--|{ MOVIMIENTO : registra
  POLIZA ||--|{ CARATULA : versiona
  POLIZA ||--o{ ASEGURADO : tiene
  POLIZA ||--|{ PERIODO : cronograma
  PERIODO ||--o{ FACTURA : genera
  FACTURA ||--|| RECIBO : tiene
  RECIBO ||--o{ PAGO : recibe
  FACTURA ||--o{ NOTA_CREDITO : ajusta
  MOVIMIENTO ||--o{ AUTORIZACION : requiere
  POLIZA ||--o{ BITACORA_INTEGRACION : audita
\`\`\`

**Estados.** Solicitud: BORRADOR → RADICADA → EN_ESTUDIO → EMITIDA | RECHAZADA. Póliza: VIGENTE | ANULADA. Recibo: PENDIENTE, PARCIAL, LEGALIZADO, EN_MORA, ANULADO (+CRUZADO, PENDIENTE_REEMBOLSO, REEMBOLSADO).

**Productos AP:** ${PRODUCTOS.map(p => p.nombre || p.id).join(', ')}.

**Políticas de suscripción:** ${tabla(['ID', 'Nombre'], POLITICAS.map(p => [p.id, p.nombre || p.titulo || ''])).trim()}

**Persistencia:** SQLite (\`node:sqlite\`), almacén por colecciones con transacción atómica (rollback descarta todo; la bitácora de integraciones sobrevive).
`);

// 07 Integraciones
w('07_integraciones_dependencias.md', `
# 07 · Integraciones y dependencias

Todas **simuladas** y marcadas como tales en la UI (pantalla *Integraciones*). Modos configurables por el Administrador: ok / falla / timeout. Cada llamada queda en la bitácora (forma LT-TI-INT-002).

${tabla(['Servicio', 'Rol', 'Bloqueante', 'Comportamiento simulado'], [
  ['Registraduría', 'Validar identidad', 'Sí (emisión)', 'Documento válido; modos falla/timeout'],
  ['Listas restrictivas (SARLAFT)', 'Cotejo', 'Sí', 'Documentos terminados en 666, 999999999, 800800800 → coincidencia'],
  ['SGDEA', 'Gestión documental', 'No', 'Devuelve radicado simulado'],
  ['CRM', 'Cliente/intermediario', 'No', 'Eco simulado'],
  ['DIAN / OPEN (facturación electrónica)', 'CUFE/resolución', 'Sí, atómico', 'Falla → no se factura nada'],
  ['SAP', 'Asiento contable', 'No', 'Falla → asiento pendiente de reintento'],
  ['Wompi', 'Pago en línea', 'No', 'Pago simulado'],
])}
Dependencias de código: ninguna (Node ≥ 24, sin paquetes). Para producción se reemplazan los adaptadores de \`lib/sim.mjs\` por los reales (microservicio de integraciones existente).
`);

// 11 Datos de prueba
w('11_datos_de_prueba.md', `
# 11 · Datos de prueba

Cargables con \`POST /api/seed\` (botón *Cargar datos de ejemplo*) y reiniciables con \`POST /api/reset\`.

**Usuarios simulados (permisos simulados, [DOC] pendiente de matriz oficial):**
${tabla(['ID', 'Nombre', 'Rol / nivel'], USUARIOS.map(u => [u.id, u.nombre, u.rol || u.nivel || '']))}
**Datos que fuerzan casos:** documento terminado en 666 / 999999999 / 800800800 → lista restrictiva; sucursal «Barranquilla» → intermediario no habilitado (HU294).

**Siembra:** 3 pólizas (nominada, innominada, individual), 6 solicitudes (borrador, radicada, en estudio con políticas pendientes, rechazada…), facturas, recibos y pagos.

**Parámetros por defecto (con procedencia):**
${tabla(['Parámetro', 'Valor', 'Origen'], Object.entries(PARAMS_DEFECTO).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v.valor ?? v) : v, typeof v === 'object' ? (v.origen || '') : '']))}
`);

// 12 Evidencia
w('12_evidencia_pruebas.md', `
# 12 · Evidencia de pruebas

## 1) Escenarios de negocio (backend real, base temporal aislada) — \`node --test tests/escenarios.test.mjs\`
\`\`\`
${resumenTest}
\`\`\`
Salida completa: \`docs/evidencia/node_test_salida.txt\`.

## 2) Recorrido de interfaz real (Chrome headless + CDP) — \`node tests/ui-e2e.mjs\`
${ui ? `${ui.total - ui.fallas}/${ui.total} verificaciones correctas (${ui.fecha}).\n\n${tabla(['Verificación', 'Resultado'], ui.resultados.map(r => [r.txt, r.ok ? 'OK' : 'FALLA ' + r.det]))}` : 'No ejecutada.'}

Captura: \`docs/evidencia/ui_escenarios.png\`.

## Qué NO está probado
- Navegadores distintos de Chrome; dispositivos móviles; carga/concurrencia; accesibilidad formal; seguridad (la autenticación es simulada por cabecera).
- Los flujos de prórroga, renovación, rehabilitación y anulación de movimiento **no existen** (ver doc 14).
`);

// 13 Cobertura
const hus = Object.entries(trz.huEscenarios).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
w('13_matriz_cobertura.md', `
# 13 · Matriz de cobertura documentación ↔ funcionalidad ↔ pruebas

${tabla(['HU', 'Escenarios que la ejercitan', 'N.º'], hus.map(([k, v]) => [k, v.join(', '), v.length]))}
**Reglas ↔ escenarios:** ver doc 04 (columna *Escenarios*). **Reglas sin prueba:** ${trz.sinPrueba.join(', ') || 'ninguna'}.

**HU sin implementar:** ${PENDIENTES_DOC.map(p => p[0]).join(', ')}.
`);

// 14 Brechas
w('14_brechas_supuestos_pendientes.md', `
# 14 · Brechas, supuestos y pendientes

## Contradicciones entre documentos y decisión tomada
${tabla(['ID', 'Contradicción', 'Fuentes', 'Decisión de la demo', 'Cómo resolverlo'], CONTRADICCIONES.map(c => [c.id, `${c.titulo}: ${c.detalle}`, c.fuentes, c.decision, c.propuesta]))}
## Brechas
${tabla(['ID', 'Brecha', 'Impacto', 'Propuesta'], BRECHAS.map(b => [b.id, `${b.titulo}: ${b.detalle}`, b.impacto, b.propuesta]))}
## Supuestos
${tabla(['ID', 'Supuesto'], SUPUESTOS.map(s => [s.id, s.texto]))}
## Decisiones
${tabla(['ID', 'Decisión'], DECISIONES.map(s => [s.id, s.texto]))}
## Alcance no implementado
Prórroga, renovación, rehabilitación, anulación de movimiento, comisiones/reaseguro/coaseguro, siniestros, autenticación real, integraciones reales.
`);
console.log('Docs generados:', M.length, 'escenarios,', REGLAS.length, 'reglas');
