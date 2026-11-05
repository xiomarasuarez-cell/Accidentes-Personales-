// Escenarios de EMISIÓN. Cada uno es ejecutable (sirve de prueba y de demostración dentro de la app).
export const E = (id, grupo, nombre, hu, tipo, m, run) => ({ id, grupo, nombre, hu, tipo, ...m, run });
const ok = 'Sin impacto';

export const emision = [
  E('ES-01', 'Emisión', 'Emisión exitosa AP Colectivo nominada e intermediada', ['HU187', 'HU191', 'HU189', 'HU192', 'HU194', 'HU647', 'HU207'], 'Exitoso', {
    descripcion: 'Camino feliz: solicitud completa → radicación → estudio técnico sin políticas pendientes → emisión.', condiciones: 'Usuario suscriptor y usuario de emisión; producto AP Colectivo; 5 asegurados; comisión 10 %.',
    entrada: 'Plan Oro con amparo básico 402 y adicional 702 (prima 120.000 por asegurado), periodicidad mensual, vigencia anual.', reglas: ['RN-EM-01', 'RN-EM-11', 'RN-EM-23', 'RN-EM-27'],
    flujo: ['Crear solicitud', 'Completar secciones', 'Radicar', 'Estudio técnico', 'Emitir'], esperado: 'Póliza VIGENTE con movimiento 1 «Emisión» y carátula versión 1.', estadoFinal: 'Solicitud EMITIDA · Póliza VIGENTE',
    impactoPoliza: 'Nace la póliza con 5 asegurados y cronograma de 12 períodos pendientes.', impactoFacturacion: 'No factura automáticamente: la facturación del primer período se ejecuta desde el módulo de Facturación (HU764-767 no disponibles).', mensajes: 'Póliza emitida con éxito.' },
    H => { const p = H.emitirPoliza(); H.igual('estado de la póliza', p.estado, 'VIGENTE'); H.paso('movimiento 1 = Emisión', p.movimientos.length === 1 && p.movimientos[0].numero === 1 && p.movimientos[0].tipo === 'Emisión'); H.paso('carátula versión 1', p.caratulas.length === 1 && p.caratulaVersion === 1);
      H.igual('prima de vigencia (5 × 120.000)', p.primaVigencia, 600000); H.igual('asegurados vigentes', p.asegurados.filter(a => a.estado === 'VIGENTE').length, 5); H.igual('períodos pendientes', p.facturacion.cronograma.filter(c => c.estado === 'PENDIENTE').length, 12); H.igual('facturas tras emitir', p.facturas.length, 0); return { polizaId: p.id }; }),

  E('ES-02', 'Emisión', 'Emisión AP Individual (un asegurado, prima del plan)', ['HU255', 'HU647'], 'Exitoso', {
    descripcion: 'Producto individual: un único plan con prima del plan y un asegurado identificado.', condiciones: 'Producto AP Individual.', entrada: 'Plan individual con prima 120.000.', reglas: ['RN-EM-11'], flujo: ['Crear', 'Completar', 'Radicar', 'Emitir'],
    esperado: 'Póliza vigente con un asegurado; prima = prima del plan.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: 'Un asegurado y un plan.', impactoFacturacion: 'Se factura una sola factura por período.', mensajes: 'Póliza emitida con éxito.' },
    H => { const p = H.emitirPoliza({ producto: 'AP_INDIVIDUAL', n: 1 }); H.igual('asegurados', p.asegurados.length, 1); H.igual('prima de vigencia', p.primaVigencia, 120000); H.igual('nAsegurados del plan', p.planesCalc[0].nAsegurados, 1); }),

  E('ES-03', 'Emisión', 'AP Generación Positiva exige rama y tipo de institución', ['HU255'], 'Validación', {
    descripcion: 'El producto de institución educativa añade campos obligatorios.', condiciones: 'Producto AP Generación Positiva.', entrada: 'Sin rama/tipo de institución, luego con ellos.', reglas: ['RN-EM-11'], flujo: ['Guardar productos sin institución', 'Corregir', 'Emitir'],
    esperado: 'Rechaza sin rama/tipo; emite al completarlos.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: 'Guarda los datos de la institución.', impactoFacturacion: ok, mensajes: 'La rama de la institución educativa es obligatoria.' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.solicitud({ producto: 'AP_GEN_POSITIVA', producto_extra: { ramaInstitucion: undefined, tipoInstitucion: undefined } });
      H.espera('guardar productos sin rama/tipo de institución', () => H.core.sol.guardarSeccion(u, s.id, 'productos', { producto: { productoId: 'AP_GEN_POSITIVA' }, planes: s.planes }, { continuar: true }), { contiene: 'rama de la institución' });
      const p = H.emitirPoliza({ producto: 'AP_GEN_POSITIVA' }); H.igual('rama guardada', p.datosProducto.ramaInstitucion, 'Mixta'); }),

  E('ES-04', 'Emisión', 'AP Viajero exige origen y destino del viaje', ['HU255'], 'Validación', {
    descripcion: 'Campos obligatorios exclusivos de AP Viajero.', condiciones: 'Producto AP Individual Viajero.', entrada: 'Sin origen/destino, luego con ellos.', reglas: ['RN-EM-11'], flujo: ['Guardar sin origen', 'Corregir', 'Emitir'],
    esperado: 'Rechaza sin origen/destino.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: 'Guarda origen y destino.', impactoFacturacion: ok, mensajes: 'El origen del viaje es obligatorio (AP Viajero).' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.solicitud({ producto: 'AP_INDIVIDUAL_VIAJERO', n: 1 });
      H.espera('guardar sin origen del viaje', () => H.core.sol.guardarSeccion(u, s.id, 'productos', { producto: { productoId: 'AP_INDIVIDUAL_VIAJERO', destinoViaje: 'Madrid' }, planes: s.planes }, { continuar: true }), { contiene: 'origen del viaje' });
      const p = H.emitirPoliza({ producto: 'AP_INDIVIDUAL_VIAJERO', n: 1 }); H.igual('destino guardado', p.datosProducto.destinoViaje, 'Madrid'); }),

  E('ES-05', 'Emisión', 'Emisión innominada (número de asegurados por plan)', ['HU255', 'HU577'], 'Alterno', {
    descripcion: 'Póliza sin listado de asegurados; la prima total es n × prima por asegurado.', condiciones: 'Estructura Innominada.', entrada: 'Plan Oro para 40 asegurados.', reglas: ['RN-EM-11', 'RN-FA-15'], flujo: ['Crear', 'Plan con n asegurados', 'Radicar', 'Emitir'],
    esperado: 'Prima total = 40 × 120.000 = 4.800.000.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: 'Sin asegurados individualizados.', impactoFacturacion: 'Se factura a nivel póliza (una factura por período).', mensajes: 'Póliza emitida con éxito.' },
    H => { const p = H.emitirPoliza({ estructura: 'Innominada', n: 40 }); H.igual('asegurados individualizados', p.asegurados.length, 0); H.igual('prima total', p.primaVigencia, 4800000); }),

  E('ES-06', 'Emisión', 'Coaseguro cedido con gastos por aseguradora (0 % permitido)', ['HU188'], 'Exitoso', {
    descripcion: 'Coaseguro cedido: participación local + aceptantes = 100 %, % de gastos por aceptante.', condiciones: 'Datos generales con coaseguro.', entrada: 'Local 60 %; Alfa 25 % (gastos 5 %); Beta 15 % (gastos 0 %).', reglas: ['RN-EM-12'], flujo: ['Registrar coaseguro', 'Radicar', 'Emitir'],
    esperado: 'Se acepta el gasto 0 % y se guarda por aseguradora.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: 'Guarda el coaseguro.', impactoFacturacion: ok, mensajes: '—' },
    H => { const p = H.emitirPoliza({ coaseguro: { tipo: 'CEDIDO', participacionLocal: 60, aceptantes: [{ aseguradora: 'Seguros Alfa', participacion: 25, gastos: 5 }, { aseguradora: 'Seguros Beta', participacion: 15, gastos: 0 }] } });
      H.igual('aceptantes guardados', p.coaseguro.aceptantes.length, 2); H.igual('gasto 0 % conservado', p.coaseguro.aceptantes[1].gastos, 0); }),

  E('ES-07', 'Emisión', 'Coaseguro: la participación no suma 100 % o falta el gasto', ['HU188'], 'Validación', {
    descripcion: 'Validaciones del coaseguro cedido.', condiciones: 'Coaseguro cedido.', entrada: 'Suma 70 %; aceptante sin % de gastos.', reglas: ['RN-EM-12'], flujo: ['Guardar coaseguro inválido'], esperado: 'Rechaza ambos casos con mensaje.', estadoFinal: 'Solicitud BORRADOR', impactoPoliza: ok, impactoFacturacion: ok,
    mensajes: 'La suma de participaciones (local + aceptantes) debe ser exactamente 100 %.' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.solicitud({ coaseguro: { tipo: 'CEDIDO', participacionLocal: 60, aceptantes: [{ aseguradora: 'Alfa', participacion: 40, gastos: 0 }] } });
      H.espera('suma 70 %', () => H.core.sol.guardarSeccion(u, s.id, 'coaseguro', { tipo: 'CEDIDO', participacionLocal: 50, aceptantes: [{ aseguradora: 'Alfa', participacion: 20, gastos: 0 }] }, { continuar: true }), { contiene: 'exactamente 100' });
      H.espera('aceptante sin % de gastos', () => H.core.sol.guardarSeccion(u, s.id, 'coaseguro', { tipo: 'CEDIDO', participacionLocal: 60, aceptantes: [{ aseguradora: 'Alfa', participacion: 40 }] }, { continuar: true }), { contiene: '% de gastos' }); }),

  E('ES-08', 'Emisión', 'Coaseguro aceptado con compañía líder', ['HU188'], 'Alterno', {
    descripcion: 'En coaseguro aceptado la líder factura y el gasto es único para Positiva.', condiciones: 'Coaseguro aceptado.', entrada: 'Local 40 %, líder 60 % con póliza LP-123, gastos 3 %.', reglas: ['RN-EM-12'], flujo: ['Registrar', 'Radicar', 'Emitir'], esperado: 'Exige líder y póliza de la líder.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: 'Guarda líder.', impactoFacturacion: ok, mensajes: 'La compañía líder es obligatoria en coaseguro aceptado.' },
    H => { const u = H.U('u-suscriptor-avanz'), valido = { tipo: 'ACEPTADO', participacionLocal: 40, lider: { compania: 'Seguros Líder', poliza: 'LP-123', participacion: 60 }, gastosAceptado: 3, aceptantes: [] };
      const s = H.solicitud({ coaseguro: valido });
      H.espera('aceptado sin compañía líder', () => H.core.sol.guardarSeccion(u, s.id, 'coaseguro', { ...valido, lider: { poliza: 'LP-123', participacion: 60 } }, { continuar: true }), { contiene: 'compañía líder' });
      H.espera('aceptado sin póliza de la líder', () => H.core.sol.guardarSeccion(u, s.id, 'coaseguro', { ...valido, lider: { compania: 'Seguros Líder', participacion: 60 } }, { continuar: true }), { contiene: 'póliza de la líder' });
      const p = H.emitirPoliza({ coaseguro: valido }); H.igual('líder guardada', p.coaseguro.lider.compania, 'Seguros Líder'); }),

  E('ES-09', 'Emisión', 'Licitación con estampillas', ['HU251'], 'Exitoso', {
    descripcion: 'Solicitud de tipo Licitación en producto masivo.', condiciones: 'AP Colectivo, tipo Licitación.', entrada: 'Presupuesto 800 M, estampillas 2,5 %, NIT 900555444.', reglas: ['RN-EM-13'], flujo: ['Completar licitación', 'Radicar', 'Emitir'], esperado: 'Emite y conserva los datos de licitación.', estadoFinal: 'Póliza VIGENTE',
    impactoPoliza: 'Guarda la licitación.', impactoFacturacion: ok, mensajes: '—' },
    H => { const p = H.emitirPoliza({ generales: { tipoSolicitud: 'Licitación' }, licitacion: { presupuestoAdjudicado: 800000000, aplicaEstampillas: true, porcentajeEstampillas: 2.5, otrosGastos: 'Ninguno', nitUnion: '900555444', razonSocial: 'Consorcio Vial' } }); H.igual('NIT guardado', p.licitacion.nitUnion, '900555444'); }),

  E('ES-10', 'Emisión', 'Licitación: producto individual o estampillas sin porcentaje', ['HU251'], 'Validación', {
    descripcion: 'La licitación solo aplica a masivos y exige % si aplican estampillas.', condiciones: '—', entrada: 'AP Individual con licitación; estampillas sin %.', reglas: ['RN-EM-13'], flujo: ['Guardar generales', 'Guardar licitación'], esperado: 'Rechaza ambos.', estadoFinal: 'Solicitud BORRADOR', impactoPoliza: ok, impactoFacturacion: ok,
    mensajes: 'La licitación aplica solo a productos masivos; se deshabilita para los individuales (HU251).' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.solicitud({ producto: 'AP_INDIVIDUAL', n: 1 });
      H.espera('licitación en producto individual', () => H.core.sol.guardarSeccion(u, s.id, 'generales', { ...s.generales, tipoSolicitud: 'Licitación' }, { continuar: true }), { contiene: 'solo a productos masivos' });
      const s2 = H.solicitud({ generales: { tipoSolicitud: 'Licitación' }, licitacion: { presupuestoAdjudicado: 1, aplicaEstampillas: false, nitUnion: '900555444', razonSocial: 'X' } });
      H.espera('estampillas sin %', () => H.core.sol.guardarSeccion(u, s2.id, 'licitacion', { presupuestoAdjudicado: 1, aplicaEstampillas: true, nitUnion: '900555444', razonSocial: 'X' }, { continuar: true }), { contiene: '% de estampillas' }); }),

  E('ES-11', 'Emisión', 'Radicar con datos incompletos', ['HU195', 'HU191'], 'Validación', {
    descripcion: 'Una solicitud vacía no puede radicarse; el sistema indica cada sección faltante.', condiciones: 'Solicitud en borrador sin completar.', entrada: 'Solicitud recién creada.', reglas: ['RN-EM-15', 'RN-EM-23'], flujo: ['Crear', 'Radicar'], esperado: 'Rechazo con detalle por sección.', estadoFinal: 'Solicitud BORRADOR', impactoPoliza: ok, impactoFacturacion: ok,
    mensajes: 'La solicitud tiene secciones incompletas o inválidas; no se puede radicar.' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.core.sol.crear(u, { productoId: 'AP_COLECTIVO' });
      const e = H.espera('radicar solicitud vacía', () => H.core.sol.radicar(u, s.id), { code: 'VALIDACION' }); const secs = new Set(e.detalle.map(d => d.seccion));
      H.paso('el detalle señala tomador, productos y asegurados', secs.has('tomador') && secs.has('productos') && secs.has('asegurados'), [...secs]);
      H.igual('sigue en borrador', H.core.sol.obtener(s.id).estado, 'BORRADOR'); }),

  E('ES-12', 'Emisión', 'Validaciones de amparos (tasa/prima, SMMLV, asistencia, carencia, deducible…)', ['HU647'], 'Validación', {
    descripcion: 'Batería de reglas de la HU647 sobre amparos.', condiciones: 'Solicitud con producto AP Colectivo.', entrada: 'Amparos con cada incumplimiento.', reglas: ['RN-EM-01', 'RN-EM-02', 'RN-EM-03', 'RN-EM-04', 'RN-EM-06', 'RN-EM-07', 'RN-EM-08', 'RN-EM-09'], flujo: ['Guardar plan con amparo inválido (×9)', 'Guardar plan válido'],
    esperado: 'Cada incumplimiento se rechaza con su mensaje; la tasa y los SMMLV calculan prima y valor asegurado.', estadoFinal: 'Solicitud BORRADOR', impactoPoliza: ok, impactoFacturacion: ok, mensajes: 'Ver cada mensaje de la HU647.' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.solicitud({}), A = (cod, t, x) => H.amparo(cod, t, x);
      const prueba = (txt, amparos, contiene) => H.espera(txt, () => H.core.sol.guardarSeccion(u, s.id, 'productos', { producto: { productoId: 'AP_COLECTIVO' }, planes: [H.plan('AP_COLECTIVO', { amparos })] }, { continuar: true }), { contiene });
      prueba('plan sin amparo básico', [A('702', 'Adicional')], 'al menos un amparo Básico');
      prueba('prima y tasa a la vez', [A('402', 'Básico', { tasaComercial: 2 })], 'excluyentes');
      prueba('amparo inhabilitado', [A('1709', 'Básico')], 'inhabilitado');
      prueba('múltiplo de sueldo sin salario', [A('402', 'Básico', { tipoValorAsegurado: 'MULTIPLO_SUELDO', factorMultiplicador: 10, valorAseguradoIndividual: undefined })], 'salario promedio');
      prueba('asistencia sin proveedor', [A('402', 'Básico'), A('9067', 'Asistencia', { primaComercial: undefined })], 'proveedor');
      prueba('carencia sin días', [A('402', 'Básico', { carencia: 'Aplica' })], 'días de carencia');
      prueba('deducible sin valor', [A('402', 'Básico', { deducible: 'Aplica', unidadDeducible: 'Días' })], 'valor del deducible');
      prueba('restablecimiento en amparo sin gastos médicos', [A('402', 'Básico', { limiteValorAsegurado: 'Restablecimiento' })], 'restablecimiento');
      prueba('edad mínima mayor que la máxima', [A('402', 'Básico', { edadMinIngreso: 70, edadMaxIngreso: 60 })], 'no puede superar');
      H.core.sol.guardarSeccion(u, s.id, 'productos', { producto: { productoId: 'AP_COLECTIVO' }, planes: [H.plan('AP_COLECTIVO', { amparos: [A('402', 'Básico', { primaComercial: undefined, tasaComercial: 2 }), A('785', 'Adicional', { tipoValorAsegurado: 'N_SMMLV', factorMultiplicador: 10, valorAseguradoIndividual: undefined, primaComercial: 20000, limiteValorAsegurado: 'Restablecimiento' })] })] }, { continuar: true });
      const calc = H.core.sol.obtener(s.id).calculo.planes[0].amparos;
      H.igual('tasa 2 por mil × VA 50.000.000 = prima 100.000', calc[0]._calc.prima, 100000); H.igual('10 SMMLV × 1.423.500 = valor asegurado', calc[1]._calc.valorAsegurado, 14235000); }),

  E('ES-13', 'Emisión', 'Amparo de asistencia: la carátula muestra «Asistencia Incluida»', ['HU647'], 'Alterno', {
    descripcion: 'Internamente el valor asegurado puede ser $0; en la carátula se muestra el texto.', condiciones: 'Plan con amparo tipo Asistencia y proveedor.', entrada: 'Asistencia odontológica (9067), proveedor E-Dental, VA $0.', reglas: ['RN-EM-06'], flujo: ['Plan con asistencia', 'Emitir', 'Ver carátula'],
    esperado: 'Carátula con «Asistencia Incluida».', estadoFinal: 'Póliza VIGENTE', impactoPoliza: 'Carátula v1 con el texto.', impactoFacturacion: ok, mensajes: 'Asistencia Incluida' },
    H => { const p = H.emitirPoliza({ planes: [H.plan('AP_COLECTIVO', { amparos: [H.amparo('402', 'Básico'), H.amparo('9067', 'Asistencia', { tipoValorAsegurado: 'SUMA_INFORMADA', valorAseguradoIndividual: 0, proveedor: 'E-Dental', primaComercial: undefined })] })] });
      const am = p.caratulas[0].planes[0].amparos.find(a => a.cod === '9067'); H.igual('valor asegurado en carátula', am.valorAsegurado, 'Asistencia Incluida'); H.paso('internamente el valor asegurado es $0', p.planesCalc[0].amparos.find(a => a.cod === '9067')._calc.valorAsegurado === 0); }),

  E('ES-14', 'Emisión', 'Siniestralidad (vida y riesgos laborales)', ['HU195'], 'Validación', {
    descripcion: 'Reglas de habilitación y obligatoriedad de la siniestralidad.', condiciones: 'Solicitud completa.', entrada: 'Reclamaciones «Sí» sin siniestro; ARL sin afiliación; adjunto PDF.', reglas: ['RN-EM-14'], flujo: ['Guardar siniestralidad (×3)', 'Guardar válida'],
    esperado: 'Rechaza los tres casos; acepta la válida.', estadoFinal: 'Solicitud BORRADOR', impactoPoliza: ok, impactoFacturacion: ok, mensajes: 'Con reclamaciones en los últimos 5 años debe registrar al menos un siniestro de vida.' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.solicitud({}), reg = { inicio: '2023-01-01', fin: '2023-12-31', cantidad: 1, amparo: 'Muerte accidental', valor: 1000000 };
      H.espera('reclamaciones Sí sin siniestro de vida', () => H.core.sol.guardarSeccion(u, s.id, 'siniestralidad', { tuvoReclamaciones: true, vida: [], arl: [] }, { continuar: true }), { contiene: 'al menos un siniestro de vida' });
      H.espera('siniestralidad ARL sin afiliación', () => H.core.sol.guardarSeccion(u, s.id, 'siniestralidad', { tuvoReclamaciones: false, vida: [], arl: [reg] }, { continuar: true }), { contiene: 'afiliado a ARL' });
      H.espera('adjunto que no es Excel', () => H.core.sol.guardarSeccion(u, s.id, 'siniestralidad', { tuvoReclamaciones: true, vida: [{ ...reg, adjunto: 'soporte.pdf' }], arl: [] }, { continuar: true }), { contiene: 'Excel' });
      const r = H.core.sol.guardarSeccion(u, s.id, 'siniestralidad', { tuvoReclamaciones: true, vida: [{ ...reg, adjunto: 'soporte.xlsx' }], arl: [] }, { continuar: true }); H.igual('errores de la sección válida', r.erroresSeccion, []); }),

  E('ES-15', 'Emisión', 'Edad del asegurado: superior a la máxima se rechaza; inferior a la mínima exige política', ['HU647', 'HU207'], 'Alterno', {
    descripcion: 'La edad del amparo básico valida el cargue; una edad menor dispara la política «edad de ingreso inferior a la permitida».', condiciones: 'Amparo básico con edades 18-65.', entrada: 'Asegurado de 70 años; asegurado de 9 años.', reglas: ['RN-EM-10', 'RN-EM-20', 'RN-EM-17'],
    flujo: ['Cargar asegurados', 'Radicar', 'Emitir (bloqueado)', 'Autorizar política', 'Emitir'], esperado: 'El de 70 se rechaza; el de 9 se acepta pero exige política; emite tras autorizar.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: 'Incluye al asegurado menor tras la autorización.', impactoFacturacion: ok,
    mensajes: 'Edad de 70 años por encima de la edad máxima de ingreso (65) del amparo básico.' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.solicitud({ asegurados: [H.asegurado(1)] });
      const r = H.core.sol.cargarAsegurados(u, s.id, [H.asegurado(2, { fechaNacimiento: '1950-01-01' }), H.asegurado(3, { fechaNacimiento: '2016-05-05' })]);
      H.paso('el asegurado de 70 años es «Incorrecto»', r.resultado[0].registro === 'Incorrecto', r.resultado[0].observaciones); H.paso('el de 9 años es «Correcto» con aviso de política', r.resultado[1].registro === 'Correcto' && r.resultado[1].observaciones.length === 1);
      H.radicar(s.id); const so = H.core.sol.obtener(s.id); H.paso('política P03 pendiente', so.politicas.some(p => p.id === 'P03' && p.estado === 'Pendiente'));
      H.espera('emitir con política pendiente', () => H.core.sol.emitir(H.U('u-emision'), s.id), { code: 'POLITICAS_PENDIENTES' });
      H.core.sol.resolverPolitica(H.U('u-suscriptor-inter'), s.id, 'P03', 'autorizar'); const e = H.core.sol.emitir(H.U('u-emision'), s.id); H.paso('emitida tras autorizar', e.rechazada === false && e.poliza.estado === 'VIGENTE'); }),

  E('ES-16', 'Emisión', 'Comisión por encima del límite: autoriza solo el nivel requerido', ['HU207'], 'Alterno', {
    descripcion: 'Política de % de comisión: el usuario Básico no puede autorizar; el Intermedio sí.', condiciones: 'Comisión 30 % (límite 25 %).', entrada: 'Intermediario con 30 %.', reglas: ['RN-EM-17', 'RN-EM-22'], flujo: ['Radicar', 'Autorizar con Básico (rechazado)', 'Autorizar con Intermedio', 'Emitir'],
    esperado: 'El Básico recibe «nivel insuficiente»; el Intermedio autoriza.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: ok, impactoFacturacion: 'La comisión se registra por asegurado en cada factura.', mensajes: 'Solicitud de Póliza No. SOL-xxxxxx requiere aprobación de Política(s) de Suscripción' },
    H => { const s = H.solicitud({ comision: 30 }); H.radicar(s.id); const so = H.core.sol.obtener(s.id); H.paso('P05 pendiente con nivel Intermedio', so.politicas.length === 1 && so.politicas[0].id === 'P05' && so.politicas[0].nivelRequerido === 'Intermedio', so.politicas);
      H.espera('autorizar con nivel Básico', () => H.core.sol.resolverPolitica(H.U('u-suscriptor-basico'), s.id, 'P05', 'autorizar'), { code: 'NIVEL_INSUFICIENTE' });
      const nt = H.core.notificaciones(H.U('u-suscriptor-inter')).map(n => n.mensaje); H.paso('notificación literal de la HU207', nt.some(m => m === `Solicitud de Póliza No. ${s.id} requiere aprobación de Política(s) de Suscripción`), nt);
      H.core.sol.resolverPolitica(H.U('u-suscriptor-inter'), s.id, 'P05', 'autorizar'); H.paso('emite', !H.core.sol.emitir(H.U('u-emision'), s.id).rechazada); }),

  E('ES-17', 'Emisión', 'Retroactividad mayor de 30 días exige nivel Superior', ['HU207'], 'Alterno', {
    descripcion: 'Código existente: 0-30 días Básico; más de 30 días Superior.', condiciones: 'Fecha del sistema 01/03/2026; vigencia desde 01/01/2026 (59 días).', entrada: 'Vigencia retroactiva.', reglas: ['RN-EM-18', 'RN-EM-17'], flujo: ['Radicar', 'Autorizar con Avanzado (rechazado)', 'Autorizar con Superior', 'Emitir'],
    esperado: 'Solo Superior autoriza.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: 'Póliza con vigencia retroactiva.', impactoFacturacion: 'Los períodos anteriores a hoy quedan pendientes de facturar (retroactividad).', mensajes: 'Su nivel de autorización no alcanza el nivel requerido.' },
    H => { H.clock('2026-03-01'); const s = H.solicitud({ desde: '2026-01-01' }); H.radicar(s.id); const so = H.core.sol.obtener(s.id); H.paso('P02 pendiente con 59 días', so.politicas[0]?.id === 'P02' && so.politicas[0].valor === 59, so.politicas);
      H.espera('autorizar con Avanzado', () => H.core.sol.resolverPolitica(H.U('u-suscriptor-avanz'), s.id, 'P02', 'autorizar'), { code: 'NIVEL_INSUFICIENTE' });
      H.core.sol.resolverPolitica(H.U('u-superior'), s.id, 'P02', 'autorizar'); const e = H.core.sol.emitir(H.U('u-emision'), s.id); H.paso('emitida', e.poliza.estado === 'VIGENTE');
      const s2 = H.solicitud({ desde: '2026-02-15' }); H.radicar(s2.id); H.igual('con 14 días no hay política', H.core.sol.obtener(s2.id).politicas.length, 0); }),

  E('ES-18', 'Emisión', 'SARLAFT incompleto: solo el Oficial de Cumplimiento autoriza', ['HU207', 'HU487'], 'Alterno', {
    descripcion: 'La política «Faltan datos SARLAFT» exige al Oficial de Cumplimiento.', condiciones: 'Formulario SARLAFT incompleto.', entrada: 'sarlaft.completo = false', reglas: ['RN-EM-19', 'RN-EM-17'], flujo: ['Radicar', 'Intentar con Superior', 'Autorizar con Oficial', 'Emitir'],
    esperado: 'Solo el Oficial de Cumplimiento autoriza.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: ok, impactoFacturacion: ok, mensajes: 'Su nivel de autorización no alcanza el nivel requerido (Oficial Cumplimiento).' },
    H => { const s = H.solicitud({ sarlaft: { completo: false } }); H.radicar(s.id);
      H.espera('autorizar con nivel Superior', () => H.core.sol.resolverPolitica(H.U('u-superior'), s.id, 'P01', 'autorizar'), { code: 'NIVEL_INSUFICIENTE' });
      H.core.sol.resolverPolitica(H.U('u-cumplimiento'), s.id, 'P01', 'autorizar'); H.paso('emite', !H.core.sol.emitir(H.U('u-emision'), s.id).rechazada); }),

  E('ES-19', 'Emisión', 'Política rechazada: la solicitud queda rechazada', ['HU207'], 'Rechazo', {
    descripcion: 'Si el autorizador rechaza una política, no hay emisión.', condiciones: 'Política pendiente.', entrada: 'Rechazar P05.', reglas: ['RN-EM-17'], flujo: ['Radicar', 'Rechazar política', 'Intentar emitir'], esperado: 'Solicitud RECHAZADA; no se emite.', estadoFinal: 'Solicitud RECHAZADA', impactoPoliza: 'No se crea la póliza.', impactoFacturacion: ok,
    mensajes: 'La solicitud está rechazada y ya no puede editarse.' },
    H => { const s = H.solicitud({ comision: 30 }); H.radicar(s.id); H.core.sol.resolverPolitica(H.U('u-suscriptor-inter'), s.id, 'P05', 'rechazar', { observacion: 'Comisión no aprobada' });
      H.igual('estado', H.core.sol.obtener(s.id).estado, 'RECHAZADA'); H.espera('emitir solicitud rechazada', () => H.core.sol.emitir(H.U('u-emision'), s.id), { code: 'ESTADO_INVALIDO' }); H.igual('pólizas', H.core.pol.listar().length, 0); }),

  E('ES-20', 'Emisión', 'Tomador en listas restrictivas: rechazo por SARLAFT', ['HU207'], 'Rechazo', {
    descripcion: 'La consulta de listas restrictivas (simulada) encuentra coincidencia.', condiciones: 'Tomador con documento terminado en 666.', entrada: 'CC 3000000666', reglas: ['RN-EM-21'], flujo: ['Radicar', 'Emitir', 'Rechazo SARLAFT'], esperado: 'Solicitud RECHAZADA con motivo SARLAFT.', estadoFinal: 'Solicitud RECHAZADA',
    impactoPoliza: 'No se crea la póliza.', impactoFacturacion: ok, mensajes: 'Rechazada por SARLAFT: el tomador coincide con listas restrictivas.' },
    H => { const s = H.solicitud({ tomador: H.tomadorNatural({ numDoc: '3000000666' }) }); H.radicar(s.id); const r = H.core.sol.emitir(H.U('u-emision'), s.id); H.paso('emisión rechazada por SARLAFT', r.rechazada === true && /SARLAFT/.test(r.motivo), r.motivo); H.igual('estado', H.core.sol.obtener(s.id).estado, 'RECHAZADA'); H.igual('pólizas', H.core.pol.listar().length, 0); }),

  E('ES-21', 'Emisión', 'Servicio de listas restrictivas caído: la emisión se bloquea sin perder la solicitud', ['HU207'], 'Error', {
    descripcion: 'Error de integración bloqueante; la operación es atómica.', condiciones: 'Listas restrictivas en modo «falla» (simulado).', entrada: 'Emitir con el servicio caído.', reglas: ['RN-FA-16'], flujo: ['Apagar servicio', 'Emitir', 'Reactivar', 'Emitir'],
    esperado: 'Error claro; la solicitud sigue radicada; emite al restablecer.', estadoFinal: 'Solicitud EMITIDA (tras reintento)', impactoPoliza: 'Sin cambios mientras falla.', impactoFacturacion: ok, mensajes: 'Listas restrictivas / SARLAFT (vía ESB) no disponible (simulado).' },
    H => { const s = H.solicitud({}); H.radicar(s.id); H.core.ctx.sim.setModo('LISTAS_RESTRICTIVAS', 'falla');
      H.espera('emitir con listas restrictivas caídas', () => H.core.sol.emitir(H.U('u-emision'), s.id), { code: 'INTEGRACION_NO_DISPONIBLE' }); H.igual('la solicitud sigue radicada', H.core.sol.obtener(s.id).estado, 'RADICADA'); H.igual('sin pólizas', H.core.pol.listar().length, 0);
      H.core.ctx.sim.setModo('LISTAS_RESTRICTIVAS', 'ok'); H.paso('emite al restablecer', !H.core.sol.emitir(H.U('u-emision'), s.id).rechazada); }),

  E('ES-22', 'Emisión', 'Permisos por rol', ['HU077', 'HU309', 'HU577'], 'Seguridad', {
    descripcion: 'Un rol sin permiso no puede ejecutar la acción (matriz simulada).', condiciones: '—', entrada: 'Usuario tercero emite; intermediario anula; funcionario anula.', reglas: ['RN-AD-22'], flujo: ['Intentar acciones no permitidas'], esperado: 'SIN_PERMISO en los tres casos.', estadoFinal: '—', impactoPoliza: ok, impactoFacturacion: ok,
    mensajes: 'El rol «Usuario tercero» no tiene permiso para esta acción.' },
    H => { const s = H.solicitud({}); H.radicar(s.id); H.espera('usuario tercero emite', () => H.core.sol.emitir(H.U('u-tercero'), s.id), { code: 'SIN_PERMISO' }); const p = H.emitirPoliza({});
      H.espera('intermediario anula', () => H.novedad(p.id, 'anular', { tipoAnulacion: 'Solicitud del tomador', fechaAnulacion: '2026-06-01', razon: 'x' }, 'u-intermediario'), { code: 'SIN_PERMISO' }); H.espera('funcionario anula', () => H.novedad(p.id, 'anular', { tipoAnulacion: 'Solicitud del tomador', fechaAnulacion: '2026-06-01', razon: 'x' }, 'u-novedades'), { code: 'SIN_PERMISO' }); }),

  E('ES-23', 'Emisión', 'Eliminar solicitud: solo en borrador', ['HU197'], 'Validación', {
    descripcion: 'Una solicitud radicada no se elimina.', condiciones: '—', entrada: 'Eliminar borrador y eliminar radicada.', reglas: ['RN-EM-24'], flujo: ['Eliminar borrador', 'Eliminar radicada'], esperado: 'El borrador se elimina; la radicada no.', estadoFinal: '—', impactoPoliza: ok, impactoFacturacion: ok,
    mensajes: 'Solo se pueden eliminar solicitudes en estado Guardado/Borrador (HU197).' },
    H => { const u = H.U('u-suscriptor-avanz'), b = H.core.sol.crear(u, {}); H.core.sol.eliminar(u, b.id); H.espera('consultar borrador eliminado', () => H.core.sol.obtener(b.id), { code: 'NO_ENCONTRADO' }); const s = H.solicitud({}); H.radicar(s.id); H.espera('eliminar solicitud radicada', () => H.core.sol.eliminar(u, s.id), { code: 'ESTADO_INVALIDO' }); }),

  E('ES-24', 'Emisión', 'Registraduría completa nombres del asegurado', ['HU404', 'HU193'], 'Alterno', {
    descripcion: 'Con CC y sin nombres el servicio simulado de Registraduría los completa.', condiciones: 'Registraduría en modo OK.', entrada: 'CC 1020202020 sin nombres.', reglas: ['RN-EM-26'], flujo: ['Cargar asegurado solo con documento'], esperado: 'Nombre «Juan», apellido «Pérez».', estadoFinal: '—', impactoPoliza: ok, impactoFacturacion: ok, mensajes: '—' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.solicitud({ asegurados: [] }); const r = H.core.sol.cargarAsegurados(u, s.id, [{ tipoDoc: 'CC', numDoc: '1020202020' }]); H.igual('registro', r.resultado[0].registro, 'Correcto'); H.igual('nombre traído de Registraduría', r.solicitud.asegurados[0].primerNombre, 'Juan'); }),

  E('ES-25', 'Emisión', 'Estudio técnico: «en estudio», secciones bloqueadas y subtotal de costos', ['HU207'], 'Alterno', {
    descripcion: 'Tras radicar solo se editan las secciones del estudio técnico; guardar deja la solicitud en estudio; % siniestralidad = subtotal.', condiciones: 'Solicitud radicada.', entrada: 'Editar costos; intentar editar el tomador.', reglas: ['RN-EM-16', 'RN-EM-25'], flujo: ['Radicar', 'Guardar costos', 'Editar tomador (bloqueado)'],
    esperado: 'Estado EN_ESTUDIO; subtotal 31,9 %.', estadoFinal: 'Solicitud EN_ESTUDIO', impactoPoliza: ok, impactoFacturacion: ok, mensajes: 'Tras radicar solo se editan las secciones del estudio técnico.' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.solicitud({}); H.radicar(s.id); const r = H.core.sol.guardarSeccion(u, s.id, 'costos', { gastosComerciales: 0 }); H.igual('estado', r.estado, 'EN_ESTUDIO');
      H.igual('subtotal % siniestralidad (15 + 10×1,19 + 5)', r.subtotalCostos, 31.9); H.espera('editar el tomador tras radicar', () => H.core.sol.guardarSeccion(u, s.id, 'tomador', H.tomadorNatural()), { code: 'ESTADO_INVALIDO' }); }),

  E('ES-26', 'Emisión', 'Guardar borrador sin validar vs. continuar validando', ['HU251'], 'Validación', {
    descripcion: '«Guardar» permite datos parciales; «Continuar» exige los obligatorios.', condiciones: '—', entrada: 'Tomador incompleto.', reglas: ['RN-EM-15'], flujo: ['Guardar parcial', 'Continuar'], esperado: 'Guardar OK con avisos; Continuar rechaza.', estadoFinal: 'Solicitud BORRADOR', impactoPoliza: ok, impactoFacturacion: ok,
    mensajes: 'Corrija los campos obligatorios o inválidos antes de continuar.' },
    H => { const u = H.U('u-suscriptor-avanz'), s = H.core.sol.crear(u, {}); const r = H.core.sol.guardarSeccion(u, s.id, 'tomador', { tipoPersona: 'Natural', primerNombre: 'Ana' }); H.paso('guardado parcial con errores informados', r.erroresSeccion.length > 0);
      H.espera('continuar con tomador incompleto', () => H.core.sol.guardarSeccion(u, s.id, 'tomador', { tipoPersona: 'Natural', primerNombre: 'Ana' }, { continuar: true }), { code: 'VALIDACION' }); }),

  E('ES-27', 'Emisión', 'La suma de primas de los amparos prevalece sobre la prima del plan', ['HU647', 'HU577'], 'Alterno', {
    descripcion: 'Si la suma de primas de los amparos no coincide con la del plan se respeta la suma de amparos para facturar; sin prima en amparos se usa la del plan.', condiciones: 'Plan con prima registrada 150.000 y amparos que suman 120.000.', entrada: 'Plan A con amparos con prima; plan B sin prima en amparos.', reglas: ['RN-EM-05'],
    flujo: ['Registrar planes', 'Emitir', 'Consultar prima'], esperado: 'Plan A factura 120.000 (diferencia −30.000 informada); plan B usa su prima de 90.000.', estadoFinal: 'Póliza VIGENTE', impactoPoliza: 'Prima de vigencia según suma de amparos.', impactoFacturacion: 'La facturación usa la suma de amparos.', mensajes: '—' },
    H => { const A = H.plan('AP_COLECTIVO', { nombre: 'Plan A', n: 2, prima: 150000 }), B = { nombre: 'Plan B', nAsegurados: 3, primaPorAsegurado: 90000, amparos: [H.amparo('402', 'Básico', { primaComercial: undefined })] };
      const p = H.emitirPoliza({ estructura: 'Innominada', planes: [A, B] }); H.igual('prima de vigencia (2×120.000 + 3×90.000)', p.primaVigencia, 510000);
      const pa = p.planesCalc.find(x => x.nombre === 'Plan A'), pb = p.planesCalc.find(x => x.nombre === 'Plan B'); H.igual('prima por asegurado del plan A', pa.primaPorAsegurado, 120000); H.igual('diferencia informada', pa.diferencia, -30000); H.igual('prima por asegurado del plan B', pb.primaPorAsegurado, 90000); }),
];
