# 02 · Inventario de documentación analizada

**Fuente principal de verdad:** la documentación. **Google Drive** (https://drive.google.com/drive/folders/1JtVhG3xHxgNgxf5xzWRMAT66Dy3g4yce) **no fue accesible** (exige inicio de sesión): **no se simuló haberla leído** (brecha G-01).

## Documentos que SÍ se leyeron (carpeta del proyecto)
| Documento | Uso en la demo |
|---|---|
| HU de Accidentes Personales (15 HU: 647, 577, 558, 446, 404, 387, 309, 300, 296, 294, 091, 077, 675, 728 y cuestionarios respondidos) | Reglas de emisión, administración y facturación (ver matriz de reglas) |
| Cuadro_Comparativo_Vida_Grupo_AP_Colectivo.pdf | Diferencias VG vs AP Colectivo (parcial; ver G-xx) |
| BASE_CONOCIMIENTO_PROCESO_EMISION_v3.md / _NOVEDADES.md / _COTIZACION.md | Contexto de procesos |
| CATALOGOS_LISTAS_PARAMETRICAS.md | Catálogos (productos, amparos, tipos) |
| ARQUITECTURA_01 SAD_POSITIVA_CORE_V4.1.docx | Arquitectura objetivo / restricciones |
| Código existente (Backend QA: 15 microservicios; Frontend dev-web-front-core; BD 345 tablas) | Diagnóstico (doc 01) |


## Documentos que FALTAN (se piden explícitamente)
| HU / documento | Tema | Tratamiento en la demo |
|---|---|---|
| HU187 | Datos generales de la solicitud | No estaba en el material; se dedujo una lista mínima de campos. |
| HU191 | Datos del tomador (solicitud) | Se usó HU309. |
| HU189 | Datos de intermediación | Se modeló clave + % de comisión. |
| HU192/HU193 | Grupo asegurable y cargue de asegurados | Se implementó cargue simple con validación de edad. |
| HU487 | Formulario SARLAFT | Indicador «completo/incompleto». |
| HU310/HU312 | Inclusión/retiro y cargue masivo de asegurados | Se aplicaron reglas citadas en HU577. |
| HU078/HU079/HU831 | Prórroga, renovación y rehabilitación | Sin documentación local para AP: NO implementadas. |
| HU561 | Anulación de movimiento | Sin documentación: NO implementada (acción visible como pendiente). |
| HU293/HU298/HU299/HU586/HU302/HU303/HU301/HU295 | Otras novedades del catálogo de AP | Sin documentación local: NO implementadas. |
| HU087 | Facturar póliza (nivel póliza) | Se implementó solo la factura por asegurado (HU577) y la innominada simple. |
| HU559/HU563 | Carátula sin prima / con prima | Se genera carátula versionada; el diseño oficial no estaba disponible. |
| HU764-767 | Emisión en línea | NO implementada: la emisión no factura automáticamente; se factura desde el módulo de Facturación. |
| HU380/HU531 | Roles y perfiles | Matriz de permisos simulada. |

**Solicitud puntual:** descargar la carpeta de Drive como ZIP a la carpeta del proyecto, o compartirla con acceso de lector, e indicar si están aprobadas las HU listadas arriba y los catálogos Excel (amparos, tarifas, políticas).

