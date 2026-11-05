# 11 · Datos de prueba

Cargables con `POST /api/seed` (botón *Cargar datos de ejemplo*) y reiniciables con `POST /api/reset`.

**Usuarios simulados (permisos simulados, [DOC] pendiente de matriz oficial):**
| ID | Nombre | Rol / nivel |
|---|---|---|
| u-suscriptor-basico | Ana Rojas | Suscriptor |
| u-suscriptor-inter | Carlos Peña | Suscriptor |
| u-suscriptor-avanz | Diana Mora | Suscriptor |
| u-emision | Eduardo Gil | Emisión |
| u-novedades | Fabiola Ruiz | Funcionario |
| u-superior | Gerardo Lara | Funcionario |
| u-cumplimiento | Helena Sosa | Oficial de Cumplimiento |
| u-intermediario | Intermediario INT-1001 | Intermediario |
| u-tercero | Usuario tercero | Usuario tercero |
| u-admin | Administrador demo | Administrador |

**Datos que fuerzan casos:** documento terminado en 666 / 999999999 / 800800800 → lista restrictiva; sucursal «Barranquilla» → intermediario no habilitado (HU294).

**Siembra:** 3 pólizas (nominada, innominada, individual), 6 solicitudes (borrador, radicada, en estudio con políticas pendientes, rechazada…), facturas, recibos y pagos.

**Parámetros por defecto (con procedencia):**
| Parámetro | Valor | Origen |
|---|---|---|
| smmlv | 1423500 | [TEST] SMMLV 2025 (valor público). La HU exige parametrizarlo; el valor vigente debe cargarlo negocio. |
| plazoPagoRecibo | 30 | [DOC] HU091: emisión + 30 días calendario. HU577 dice "días del producto o del acuerdo de pago" → contradicción registrada. |
| ivaPorProducto | 0 | [COD] hallazgo D-4: el sistema actual factura IVA = 0 fuera de Salud. HU577 dice "si corresponde". Definición tributaria pendiente. |
| retroMaxBasico | 30 | [COD] PoliticaRetroactividadServiceImpl:53-59 → 0-30 días nivel BÁSICO; >30 días nivel SUPERIOR. |
| primaMinima | 50000 | [TEST] En el código actual la política de prima mínima es un stub (lanza "Politic Not complete"). Valor de prueba. |
| comisionMax | 25 | [COD] PorcentajeComisionRamo (solo VG y Exequias; AP no existe) → se usa el tope BÁSICO de VG (25 %) como valor de prueba. |
| retornoMax | 10 | [TEST] No hay umbral AP documentado. |
| comisionRetornoMax | 30 | [TEST] No hay umbral AP documentado. |
| vaMaxPorPersona | 500000000 | [TEST] No hay escala AP documentada (en el código existe escala por amparo solo para VG/Exequias). |
| nivelRetroSuperior | "Superior" | [COD] mismo archivo: >30 días exige SUPERIOR. |
| nivelComisionExcede | "Intermedio" | [COD] PorcentajeComisionRamo VG: 26-35 INTERMEDIO. |
| nivelOtras | "Intermedio" | [TEST] Nivel requerido de las demás políticas (no documentado para AP). |
| gastosAdminDefecto | 15 | [DOC] HU207: valor predefinido 15 %. |
| ivaComision | 19 | [DOC] HU207: IVA comisión 19 %, no editable. |
| ivaRetorno | 19 | [DOC] HU207: IVA retorno 19 %, no editable. |
| utilidadDefecto | 5 | [DOC] HU207: utilidad predefinida 5 %. |


