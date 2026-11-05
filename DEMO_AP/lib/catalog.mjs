// Catálogos de la demo. Cada bloque indica su procedencia:
//   [DOC]  = tomado literalmente de las HU de AP
//   [COD]  = tomado del código fuente existente (rama QA del repositorio)
//   [TEST] = DATO DE PRUEBA de la demo. NO es regla documentada (el insumo original no estaba disponible).

// [COD] dev-ms-core-producto APProductoEnum + [DOC] HU255 / HU647 / HU251 / HU294
export const PRODUCTOS = [
  { id: 'AP_COLECTIVO', nombre: 'Accidentes Personales Colectivo', modelo: 'grupo', masivo: true, eventosAsegurado: 2 },
  { id: 'AP_CORTO_PLAZO', nombre: 'Accidentes Personales Corto Plazo', modelo: 'grupo', masivo: true, eventosAsegurado: 1 },
  { id: 'AP_GEN_POSITIVA', nombre: 'Accidentes Personales Generación Positiva', modelo: 'institucion', masivo: true, eventosAsegurado: null /* ilimitado */ },
  { id: 'AP_COMP_RL', nombre: 'Accidentes Personales Complemento Riesgos Laborales', modelo: 'grupo', masivo: true, eventosAsegurado: 2 },
  { id: 'AP_INDIVIDUAL', nombre: 'Accidentes Personales Individual', modelo: 'individual', masivo: false, eventosAsegurado: 2 },
  { id: 'AP_INDIVIDUAL_BICIBLES', nombre: 'Accidentes Personales Individual Bicibles', modelo: 'individual', masivo: false, eventosAsegurado: undefined /* no documentado */, sinCambioSucursal: true },
  { id: 'AP_INDIVIDUAL_VIAJERO', nombre: 'Accidentes Personales Individual Viajero', modelo: 'individual', masivo: false, eventosAsegurado: undefined, viajero: true, sinCambioSucursal: true },
];
export const RAMO_AP_ID = 11; // [COD] VelocityUtils.RAMO_AP / ApCertificadoStrategy.RAMO_AP

// [DOC] HU647 – catálogo de amparos (código, nombre). inh = inhabilitado (no seleccionable). asist = tipo Asistencia.
const A = (cod, nombre, extra = {}) => ({ cod: String(cod), nombre, ...extra });
export const AMPAROS = [
  A(1709, 'Invalidez accidental y/o desmembración', { inh: true }), A(1713, 'Renta mensual por muerte accidental'), A(402, 'Muerte accidental'),
  A(409, 'Renta diaria por hospitalización'), A(702, 'Gastos médicos por accidente', { restablece: true }), A(714, 'Incapacidad total y permanente renta mensual'),
  A(7204, 'Auxilio de matrícula por accidentes'), A(7205, 'Auxilio odontológico'), A(7207, 'Auxilio por desempleo de uno de los padres'),
  A(7208, 'Auxilio por paternidad o maternidad'), A(7212, 'Auxilio por desmembración por accidente'), A(7214, 'Beneficio diario por incapacidad temporal'),
  A(7217, 'Incapacidad total y permanente por accidente'), A(7218, 'Incapacidad total y permanente por enfermedad amparada'),
  A(7220, 'Reembolso para traslado de restos mortales por accidente del asegurado'), A(7221, 'Reembolso para traslado de un familiar en caso de accidente grave o mortal'),
  A(7222, 'Renta diaria por incapacidad temporal por accidente'), A(7224, 'Servicio de ambulancia aérea'), A(7226, 'Traslado de accidentados dentro de la institución asegurada'),
  A(7227, 'Útiles y uniformes por desempleos involuntario'), A(738, 'Auxilio de maternidad', { inh: true }),
  A(785, 'Gastos médicos derivados de accidentes amparados', { restablece: true }), A(800, 'Gastos de traslado por accidente'), A(840, 'Muerte por cualquier causa'),
  A(841, 'Rehabilitación integral por invalidez'), A(842, 'Auxilio funerario por muerte accidental'), A(843, 'Enfermedades tropicales infecciosas'), A(844, 'Enfermedades amparadas'),
  A(845, 'Gastos de traslado por eventos no accidentales'), A(846, 'Auxilio educativo por muerte de padres'), A(847, 'Riesgo biológico'),
  A(848, 'Auxilio funerario por fallecimiento de docente'), A(849, 'Amparo de renta mensual por muerte accidental del cónyuge del estudiante asegurado'),
  A(850, 'Auxilio funerario por muerte no accidental'), A(9065, 'Renta diaria por hospitalización en unidad de cuidados intensivos'),
  A(9066, 'Renta diaria por hospitalización domiciliaria'), A(9067, 'Asistencia odontológica', { asist: true }), A(9068, 'Asistencia internacional en viajes', { asist: true }),
  A(9069, 'Auxilio por accidente'), A(9072, 'Auxilio por incapacidad'), A(9073, 'Rehabilitación psicológica por abuso sexual'), A(9085, 'Herida abierta'), A(9086, 'Fractura'),
  A(9087, 'Urgencia médica'), A('S01', 'Asistencia de teleorientación nutricional', { asist: true }), A('S02', 'Asistencia fisioterapia', { asist: true }),
  A('S03', 'Asistencia oftalmológica', { asist: true }), A('S04', 'Asistencia tele-psicológica', { asist: true }), A('S05', 'Auxilio por Paternidad'), A('S06', 'Homicidio'),
  A('S07', 'Riesgo químico'), A('S08', 'Auxilio por Desempleo del estudiante asegurado'), A('S09', 'Asistencia de tele consulta médica', { asist: true }),
]; // S01..S09 = amparos sin código en la HU (código interno de la demo)

export const PROVEEDORES_ASISTENCIA = ['Assist Card', 'Grupo Emi', 'World Travel Assist Latam', 'Medical Solutions Colombia', 'SIGMA', 'E-Dental', 'Medismart']; // [DOC] HU647
export const TIPOS_VALOR_ASEGURADO = ['SUMA_INFORMADA', 'N_SMMLV', 'MULTIPLO_SUELDO']; // [DOC] HU647
export const TIPOS_AMPARO = ['Básico', 'Adicional', 'Asistencia']; // [DOC] HU647
export const PERIODICIDADES = { Anual: 12, Semestral: 6, Trimestral: 3, Mensual: 1 }; // [DOC] HU675
export const TIPOS_DOC = ['TI', 'CC', 'RC', 'CE', 'PA', 'DE', 'CD', 'NUIP', 'PE', 'SC', 'PPT', 'NS', 'AS', 'MS', 'SI']; // [DOC] HU404
export const TIPOS_DOC_TOMADOR_NATURAL = ['CC', 'CE', 'PA']; // [DOC] HU309
export const TIPOS_BENEFICIARIO = ['Gratuito', 'Oneroso', 'Sustituto', 'Contingente']; // [DOC] HU404
export const MOTIVOS_ANULACION = ['Condiciones técnicas', 'Error en la expedición', 'Falta de pago', 'Fallo judicial']; // [DOC] HU077
export const TIPOS_ANULACION = ['Solicitud del tomador', 'Decisión de la aseguradora']; // [DOC] HU077
export const RAMAS_INSTITUCION = ['Mixta', 'Femenina', 'Masculina']; // [DOC] HU255
export const TIPOS_INSTITUCION = ['Colegio', 'Universidad', 'Jardín Infantil']; // [DOC] HU255
export const PARENTESCOS = { // [DOC] HU404 (la HU propone esta lista y pide validarla contra el catálogo de datos)
  1: 'Asegurado Principal', 2: 'Cónyuge', 3: 'Compañero(a) permanente', 4: 'Hijo(a)', 5: 'Madre', 6: 'Padre', 7: 'Suegro(a)', 8: 'Hermano(a)', 9: 'Abuelo(a)',
  10: 'Tío(a)', 11: 'Sobrino(a)', 12: 'Cuñado(a)', 13: 'Primo(a)', 14: 'Nieto(a)', 15: 'Yerno', 16: 'Nuera', 17: 'Acreedor - oneroso', 18: 'Empleado(a) de confianza',
  19: 'Fundación', 20: 'Socio(a)', 21: 'Ahijado(a)', 22: 'Servicio doméstico', 23: 'Mascota', 24: 'Hijastro(a)', 25: 'Madre adoptiva', 27: 'Padre adoptivo', 28: 'Madrastra',
  29: 'Padrastro', 30: 'Progenitor(a)', 31: 'Bisabuelo(a)', 32: 'Bisnieto(a)', 33: 'Ex-esposo(a)', 34: 'Tataranieto(a)', 35: 'Nana', 36: 'Novio(a)', 37: 'Amigo(a)', 38: 'Otro' };

// [DOC] HU207 – niveles de autorización (orden ascendente). [COD] ConstantesUtils:97-103 (ids 7001..7007)
export const NIVELES = ['Consulta', 'Básico', 'Intermedio', 'Avanzado', 'Superior', 'Extra', 'Oficial Cumplimiento'];
export const rankNivel = n => NIVELES.indexOf(n);

// [DOC] HU207 – listado de políticas del ramo. nivel/umbral: ver PARAMS_DEFECTO (algunos [COD], otros [TEST])
export const POLITICAS = [
  { id: 'P01', nombre: 'Faltan datos SARLAFT', ref: 'HU 487' },
  { id: 'P02', nombre: 'Retroactividad excede límite permitido' },
  { id: 'P03', nombre: 'Edad de ingreso inferior a la permitida' },
  { id: 'P04', nombre: 'Póliza no cumple con la prima mínima establecida' },
  { id: 'P05', nombre: 'Porcentaje de comisión excede límite permitido' },
  { id: 'P06', nombre: 'Porcentaje de retorno excede límite permitido' },
  { id: 'P07', nombre: 'Porcentaje de comisión y retorno excede límite establecido' },
  { id: 'P08', nombre: 'Valor Asegurado excede límite' },
];

// Parámetros editables (pantalla Configuración). origen documenta la procedencia de cada valor.
export const PARAMS_DEFECTO = {
  smmlv: { valor: 1423500, origen: '[TEST] SMMLV 2025 (valor público). La HU exige parametrizarlo; el valor vigente debe cargarlo negocio.' },
  plazoPagoRecibo: { valor: 30, origen: '[DOC] HU091: emisión + 30 días calendario. HU577 dice "días del producto o del acuerdo de pago" → contradicción registrada.' },
  ivaPorProducto: { valor: 0, origen: '[COD] hallazgo D-4: el sistema actual factura IVA = 0 fuera de Salud. HU577 dice "si corresponde". Definición tributaria pendiente.' },
  retroMaxBasico: { valor: 30, origen: '[COD] PoliticaRetroactividadServiceImpl:53-59 → 0-30 días nivel BÁSICO; >30 días nivel SUPERIOR.' },
  primaMinima: { valor: 50000, origen: '[TEST] En el código actual la política de prima mínima es un stub (lanza "Politic Not complete"). Valor de prueba.' },
  comisionMax: { valor: 25, origen: '[COD] PorcentajeComisionRamo (solo VG y Exequias; AP no existe) → se usa el tope BÁSICO de VG (25 %) como valor de prueba.' },
  retornoMax: { valor: 10, origen: '[TEST] No hay umbral AP documentado.' },
  comisionRetornoMax: { valor: 30, origen: '[TEST] No hay umbral AP documentado.' },
  vaMaxPorPersona: { valor: 500000000, origen: '[TEST] No hay escala AP documentada (en el código existe escala por amparo solo para VG/Exequias).' },
  nivelRetroSuperior: { valor: 'Superior', origen: '[COD] mismo archivo: >30 días exige SUPERIOR.' },
  nivelComisionExcede: { valor: 'Intermedio', origen: '[COD] PorcentajeComisionRamo VG: 26-35 INTERMEDIO.' },
  nivelOtras: { valor: 'Intermedio', origen: '[TEST] Nivel requerido de las demás políticas (no documentado para AP).' },
  gastosAdminDefecto: { valor: 15, origen: '[DOC] HU207: valor predefinido 15 %.' },
  ivaComision: { valor: 19, origen: '[DOC] HU207: IVA comisión 19 %, no editable.' },
  ivaRetorno: { valor: 19, origen: '[DOC] HU207: IVA retorno 19 %, no editable.' },
  utilidadDefecto: { valor: 5, origen: '[DOC] HU207: utilidad predefinida 5 %.' },
};

// [TEST] Sucursales e intermediarios de prueba (el Excel de sucursales de HU558 no estaba disponible)
export const SUCURSALES = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga'];
export const INTERMEDIARIOS = [
  { clave: 'INT-1001', nombre: 'Seguros Andinos Ltda.', identificacion: '900100200', sucursales: ['Bogotá', 'Medellín', 'Cali'] },
  { clave: 'INT-1002', nombre: 'Corredores del Caribe S.A.S.', identificacion: '900300400', sucursales: ['Barranquilla', 'Bogotá'] },
  { clave: 'INT-1003', nombre: 'Asesores Santander', identificacion: '900500600', sucursales: ['Bucaramanga'] },
];

// [TEST] Usuarios simulados. La autenticación real (login/Dex) NO se simula: es solo un selector de rol.
export const USUARIOS = [
  { id: 'u-suscriptor-basico', nombre: 'Ana Rojas', rol: 'Suscriptor', nivel: 'Básico' },
  { id: 'u-suscriptor-inter', nombre: 'Carlos Peña', rol: 'Suscriptor', nivel: 'Intermedio' },
  { id: 'u-suscriptor-avanz', nombre: 'Diana Mora', rol: 'Suscriptor', nivel: 'Avanzado' },
  { id: 'u-emision', nombre: 'Eduardo Gil', rol: 'Emisión', nivel: 'Básico' },
  { id: 'u-novedades', nombre: 'Fabiola Ruiz', rol: 'Funcionario', nivel: 'Básico' },
  { id: 'u-superior', nombre: 'Gerardo Lara', rol: 'Funcionario', nivel: 'Superior' },
  { id: 'u-cumplimiento', nombre: 'Helena Sosa', rol: 'Oficial de Cumplimiento', nivel: 'Oficial Cumplimiento' },
  { id: 'u-intermediario', nombre: 'Intermediario INT-1001', rol: 'Intermediario', nivel: 'Consulta', claveIntermediario: 'INT-1001' },
  { id: 'u-tercero', nombre: 'Usuario tercero', rol: 'Usuario tercero', nivel: 'Consulta' },
  { id: 'u-admin', nombre: 'Administrador demo', rol: 'Administrador', nivel: 'Extra' },
];

// [TEST] Matriz de permisos simulada (la matriz oficial de roles/perfiles –HU380/HU531– no estaba disponible)
export const PERMISOS = {
  crearSolicitud: ['Suscriptor', 'Emisión', 'Funcionario', 'Intermediario', 'Usuario tercero', 'Administrador'],
  estudioTecnico: ['Suscriptor', 'Administrador'],
  emitir: ['Emisión', 'Suscriptor', 'Administrador'],
  anular: ['Suscriptor', 'Administrador'],               // HU077: "Usuario suscriptor"
  novedades: ['Funcionario', 'Suscriptor', 'Emisión', 'Administrador'],
  novedadTercero: ['Usuario tercero', 'Funcionario', 'Intermediario', 'Suscriptor', 'Administrador'], // HU309/HU404: "usuario tercero, funcionario, intermediario"
  facturar: ['Emisión', 'Intermediario', 'Funcionario', 'Administrador'], // HU577: "intermediario con delegación y usuario con rol de emisión"
  recibo: ['Usuario tercero', 'Funcionario', 'Intermediario', 'Emisión', 'Suscriptor', 'Administrador'],
  pago: ['Funcionario', 'Administrador', 'Emisión'],
  configurar: ['Administrador'],
};

// [DOC] HU187 no estaba disponible: lista mínima de campos de Datos Generales deducida de las demás HU.
export const TIPOS_SOLICITUD = ['Normal', 'Licitación'];
export const ESTRUCTURAS = ['Nominada', 'Innominada'];
