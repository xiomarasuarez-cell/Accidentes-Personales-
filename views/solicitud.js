import { h, GET, POST, PUT, DEL, state, card, table, chip, money, link, form, btn, run, modal, toast, kv, clear, marcarErrores, showError, csvDownload, nombrePersona } from '../ui.js';
import { tomadorForm } from './comun.js';

const clon = o => JSON.parse(JSON.stringify(o ?? null));
const ETIQ = { generales: 'Datos generales', coaseguro: 'Coaseguro', licitacion: 'Licitación', tomador: 'Tomador', intermediacion: 'Intermediación', productos: 'Productos, planes y amparos', asegurados: 'Grupo asegurable', siniestralidad: 'Siniestralidad', sarlaft: 'SARLAFT', estudio: 'Estudio técnico', resumen: 'Resumen y emisión' };

export async function render(el, [id], { rerender }) {
  let s = await GET(`/solicitudes/${id}`); const m = state.meta; let sec = ['BORRADOR'].includes(s.estado) ? 'generales' : 'estudio';
  const radicada = () => ['RADICADA', 'EN_ESTUDIO'].includes(s.estado), cerrada = () => ['EMITIDA', 'RECHAZADA'].includes(s.estado);
  const editable = k => s.estado === 'BORRADOR' || (radicada() && ['productos', 'asegurados', 'sarlaft', 'estudio'].includes(k));
  const refrescar = async (nuevaSec) => { s = await GET(`/solicitudes/${id}`); if (nuevaSec) sec = nuevaSec; pintar(); };
  const guardar = async (seccion, data, continuar, siguiente) => { const r = await run(() => PUT(`/solicitudes/${id}/seccion/${seccion}`, { data, continuar }), continuar ? 'Sección validada y guardada' : 'Borrador guardado'); if (r) { s = r; if (continuar && siguiente) sec = siguiente; pintar(); } return r; };
  const visibles = () => ['generales', ...(s.generales.tieneCoaseguro ? ['coaseguro'] : []), ...(s.generales.tipoSolicitud === 'Licitación' ? ['licitacion'] : []), 'tomador', ...(s.generales.intermediada ? ['intermediacion'] : []), 'productos', ...(s.generales.estructura === 'Nominada' ? ['asegurados'] : []), 'siniestralidad', 'sarlaft', 'estudio', 'resumen'];
  const sigDe = k => { const v = visibles(); return v[v.indexOf(k) + 1] || 'resumen'; };
  const errDe = k => (s.validacion[k === 'productos' ? 'productos' : k] || []);

  const cuerpo = h('div'); const nav = h('div', { class: 'steps' });
  function pintar() {
    clear(nav); clear(cuerpo);
    if (!visibles().includes(sec)) sec = visibles()[0];
    for (const k of visibles()) {
      const err = k === 'estudio' ? (s.politicas || []).filter(p => p.estado !== 'Autorizada') : k === 'resumen' ? [] : errDe(k); const bloqueado = k === 'estudio' && s.estado === 'BORRADOR';
      const dot = k === 'resumen' ? '✓' : bloqueado ? '·' : err.length ? '!' : '✓';
      nav.append(h('button', { class: `step ${k === sec ? 'on' : ''} ${bloqueado ? 'lock' : ''}`, onclick: () => { if (!bloqueado) { sec = k; pintar(); } else toast('El estudio técnico se habilita al radicar la solicitud.', 'warn'); } }, h('span', { class: `dot ${bloqueado ? '' : err.length ? 'warn' : 'ok'}` }, dot), ETIQ[k]));
    }
    cuerpo.append(encabezado(), secciones[sec]());
  }
  const encabezado = () => card(null, h('div', { class: 'toolbar', style: { margin: 0 } }, h('div', null, h('b', null, `${s.id} · ${s.producto_?.nombre || 'Sin producto'}`), h('div', { class: 'muted small' }, `${s.estado === 'BORRADOR' ? 'Guardado/Borrador' : s.estado.replace('_', ' ')} · creada por ${s.creadaPor} el ${s.fechaCreacion}${s.codigoRadicacion ? ' · radicado ' + s.codigoRadicacion : ''}`)),
    chip(s.estado), s.polizaId ? link(`Ver póliza ${s.polizaId}`, `#/poliza/${s.polizaId}`) : null, s.motivoRechazo ? h('span', { class: 'chip bad' }, s.motivoRechazo) : null,
    !editable(sec) && !cerrada() && sec !== 'resumen' ? h('span', { class: 'chip muted' }, 'Sección bloqueada tras radicar') : null));

  const pie = (seccion, obtener, { sinContinuar = false } = {}) => editable(seccion) ? h('div', { class: 'rowact', style: { marginTop: '14px' } }, btn('Guardar borrador', () => guardar(seccion, obtener(), false)), sinContinuar ? null : btn('Guardar y continuar', () => guardar(seccion, obtener(), true, sigDe(seccion)), 'primary')) : h('p', { class: 'muted small' }, 'Esta sección ya no es editable en el estado actual de la solicitud.');
  const errs = (k) => errDe(k).length ? h('div', { class: 'note warn' }, h('b', null, 'Pendiente en esta sección: '), h('ul', { style: { margin: '4px 0 0', paddingLeft: '18px' } }, errDe(k).slice(0, 8).map(e => h('li', null, e.mensaje)))) : null;

  const secciones = {
    generales() {
      const d = clon(s.generales), f = form(d), ro = !editable('generales');
      return card('Datos generales del negocio', h('div', null, errs('generales'), h('div', { class: 'note' }, 'HU187 (datos generales) no estaba disponible: los campos se dedujeron de las demás HU (brecha G-10).'),
        h('div', { class: 'frm' }, f.select('tipoSolicitud', 'Tipo de solicitud', m.tiposSolicitud, { req: true, disabled: ro }), f.select('estructura', 'Estructura', m.estructuras, { req: true, disabled: ro, hint: 'Nominada: listado de asegurados; Innominada: número de asegurados por plan.' }), f.date('vigenciaDesde', 'Vigencia desde', { req: true, disabled: ro }), f.date('vigenciaHasta', 'Vigencia hasta', { req: true, disabled: ro }),
          f.select('periodicidad', 'Periodicidad de facturación', m.periodicidades, { req: true, disabled: ro }), f.select('sucursal', 'Sucursal', m.sucursales, { req: true, disabled: ro }), f.bool('intermediada', '¿Póliza intermediada?', { req: true, disabled: ro }), f.bool('tieneCoaseguro', '¿Tiene coaseguro?', { req: true, disabled: ro }),
          f.bool('afiliadoARL', '¿Cliente afiliado a ARL Positiva?', { req: true, disabled: ro }), f.bool('requiereRetorno', '¿Maneja retorno de primas?', { disabled: ro }), f.num('plazoPagoDias', 'Acuerdo de pago: días de plazo del recibo', { min: 1, disabled: ro, hint: 'Opcional; por defecto 30 días.' })),
        pie('generales', () => d)));
    },
    coaseguro() {
      const d = clon(s.coaseguro) || { tipo: 'CEDIDO', participacionLocal: null, aceptantes: [{ aseguradora: '', participacion: null, gastos: null }], lider: {}, gastosAceptado: null }; d.aceptantes ||= []; d.lider ||= {};
      const ro = !editable('coaseguro'); const caja = h('div'); const f = form(d, { onChange: (p) => { if (p === 'tipo') dibujar(); else sumar(); } }); const info = h('div', { class: 'note' });
      const sumar = () => { const t = (Number(d.participacionLocal) || 0) + (d.tipo === 'CEDIDO' ? d.aceptantes.reduce((a, x) => a + (Number(x.participacion) || 0), 0) : Number(d.lider?.participacion) || 0); info.textContent = `Suma de participaciones: ${t.toFixed(3).replace(/\.?0+$/, '')} % (debe ser 100 %).`; info.className = `note ${Math.abs(t - 100) < 0.0005 ? 'ok' : 'warn'}`; };
      const dibujar = () => {
        clear(caja); caja.append(h('div', { class: 'frm' }, f.select('tipo', 'Tipo de coaseguro', ['CEDIDO', 'ACEPTADO'], { req: true, disabled: ro }), f.num('participacionLocal', '% participación local (Positiva)', { req: true, disabled: ro })));
        if (d.tipo === 'CEDIDO') {
          caja.append(h('div', { class: 'sec' }, 'Aseguradoras aceptantes'));
          d.aceptantes.forEach((a, i) => caja.append(h('div', { class: 'frm', style: { marginBottom: '8px' } }, f.text(`aceptantes.${i}.aseguradora`, 'Aseguradora', { req: true, disabled: ro }), f.num(`aceptantes.${i}.participacion`, '% participación', { req: true, disabled: ro }), f.num(`aceptantes.${i}.gastos`, '% de gastos del coaseguro', { req: true, disabled: ro, hint: '0 % es válido' }), ro ? null : h('div', { style: { alignSelf: 'end' } }, btn('Quitar', () => { d.aceptantes.splice(i, 1); dibujar(); }, 'sm')))));
          if (!ro) caja.append(btn('+ Agregar aseguradora', () => { d.aceptantes.push({ aseguradora: '', participacion: null, gastos: null }); dibujar(); }, 'sm'));
        } else caja.append(h('div', { class: 'frm' }, f.text('lider.compania', 'Compañía líder', { req: true, disabled: ro }), f.text('lider.poliza', 'Número de póliza de la líder', { req: true, disabled: ro }), f.num('lider.participacion', '% participación de la líder', { req: true, disabled: ro }), f.num('gastosAceptado', '% de gastos (único, egreso de Positiva)', { req: true, disabled: ro })));
        sumar();
      };
      dibujar();
      return card('Datos de coaseguro (HU188)', h('div', null, errs('coaseguro'), caja, info, pie('coaseguro', () => d)));
    },
    licitacion() {
      const d = clon(s.licitacion) || {}, f = form(d, { onChange: p => { if (p === 'aplicaEstampillas') pintar2(); } }), ro = !editable('licitacion'); const caja = h('div');
      const pintar2 = () => { clear(caja); caja.append(h('div', { class: 'frm' }, f.num('presupuestoAdjudicado', 'Presupuesto adjudicado', { req: true, disabled: ro }), f.bool('aplicaEstampillas', '¿Aplica estampillas?', { req: true, disabled: ro }), d.aplicaEstampillas ? f.num('porcentajeEstampillas', '% de estampillas', { req: true, disabled: ro }) : null, f.text('otrosGastos', 'Otros gastos o impuestos a considerar', { disabled: ro }), f.text('nitUnion', 'NIT de la Unión Temporal o Consorcio', { req: true, disabled: ro }), f.text('razonSocial', 'Razón social', { req: true, disabled: ro }))); }; pintar2();
      return card('Datos de licitación (HU251)', h('div', null, errs('licitacion'), h('p', { class: 'muted' }, 'Aplica solo a productos masivos.'), caja, pie('licitacion', () => d)));
    },
    tomador() { const d = clon(s.tomador) || { tipoPersona: 'Natural' }; return card('Datos del tomador', h('div', null, errs('tomador'), tomadorForm(d, !editable('tomador')), pie('tomador', () => d))); },
    intermediacion() {
      const d = clon(s.intermediacion) || { intermediarios: [] }; d.intermediarios ||= []; const ro = !editable('intermediacion'); const f = form(d); const caja = h('div');
      const dib = () => { clear(caja); d.intermediarios.forEach((it, i) => caja.append(h('div', { class: 'frm', style: { marginBottom: '8px' } }, f.select(`intermediarios.${i}.clave`, 'Intermediario', m.intermediarios.map(x => ({ v: x.clave, t: `${x.clave} · ${x.nombre} (${x.sucursales.join(', ')})` })), { req: true, disabled: ro }), f.num(`intermediarios.${i}.comision`, '% de comisión (antes de IVA)', { req: true, disabled: ro }), ro ? null : h('div', { style: { alignSelf: 'end' } }, btn('Quitar', () => { d.intermediarios.splice(i, 1); dib(); }, 'sm'))))); if (!ro) caja.append(btn('+ Agregar intermediario', () => { d.intermediarios.push({ clave: '', comision: null }); dib(); }, 'sm')); }; dib();
      return card('Datos de intermediación (HU189)', h('div', null, errs('intermediacion'), h('div', { class: 'note' }, 'HU189 no estaba disponible: se modela clave de intermediario + % de comisión (brecha G-10).'), caja, pie('intermediacion', () => d)));
    },
    productos() {
      const d = { producto: clon(s.producto) || {}, planes: clon(s.planes) || [] }; const ro = !editable('productos'); const prodSel = m.productos.find(p => p.id === d.producto.productoId); const nominada = s.generales.estructura === 'Nominada';
      const fp = form(d, { onChange: p => { if (p === 'producto.productoId') pintarProd(); } }); const caja = h('div'); const calc = s.calculo?.planes || [];
      const pintarProd = () => {
        clear(caja); const pr = m.productos.find(p => p.id === d.producto.productoId);
        caja.append(h('div', { class: 'frm' }, fp.select('producto.productoId', 'Producto', m.productos.map(p => ({ v: p.id, t: p.nombre })), { req: true, disabled: ro || radicada() }),
          pr?.modelo === 'institucion' ? [fp.select('producto.ramaInstitucion', 'Rama de la institución educativa', m.ramasInstitucion, { req: true, disabled: ro }), fp.select('producto.tipoInstitucion', 'Tipo de institución educativa', m.tiposInstitucion, { req: true, disabled: ro })] : null,
          pr?.viajero ? [fp.text('producto.origenViaje', 'Origen del viaje', { req: true, disabled: ro }), fp.text('producto.destinoViaje', 'Destino del viaje', { req: true, disabled: ro })] : null, h('div', { class: 'wide' }, h('small', { class: 'muted' }, pr ? `Modelo: ${{ grupo: 'grupo (n asegurados × prima por asegurado)', institucion: 'institución educativa (grupo + datos de la institución)', individual: 'individual (un plan, un asegurado, prima del plan)' }[pr.modelo]}${pr.masivo ? ' · masivo' : ' · individual'}` : 'Seleccione el producto para ver sus campos.'))));
        d.planes.forEach((pl, pi) => caja.append(planCard(pl, pi, pr, calc[pi])));
        if (pr && !ro && !(pr.modelo === 'individual' && d.planes.length >= 1)) caja.append(btn('+ Agregar plan', () => { d.planes.push({ nombre: '', nAsegurados: null, primaPorAsegurado: null, amparos: [] }); pintarProd(); }));
      };
      const planCard = (pl, pi, pr, c) => {
        const f = form(d, { onChange: () => {} }); const ind = pr?.modelo === 'individual';
        return h('div', { class: 'card', style: { background: 'var(--bg)' } }, h('div', { class: 'cbody' }, h('div', { class: 'frm' }, fp.text(`planes.${pi}.nombre`, 'Nombre del plan', { req: true, disabled: ro }), !ind && !nominada ? fp.num(`planes.${pi}.nAsegurados`, 'Número de asegurados del plan', { req: true, disabled: ro }) : null,
          fp.num(`planes.${pi}.primaPorAsegurado`, ind ? 'Prima del plan' : 'Prima por asegurado (vigencia)', { req: true, disabled: ro }), ro ? null : h('div', { style: { alignSelf: 'end' } }, btn('Eliminar plan', () => { d.planes.splice(pi, 1); pintarProd(); }, 'sm'))),
          c ? h('p', { class: 'small muted' }, `Prima efectiva por asegurado: ${money(c.primaPorAsegurado)}${c.usaAmparos ? ' (suma de amparos)' : ' (prima del plan)'} · asegurados: ${c.nAsegurados} · prima total del plan: ${money(c.primaTotalPlan)}${c.diferencia ? ` · diferencia amparos vs plan: ${money(c.diferencia)}` : ''}`) : null,
          h('div', { class: 'sec', style: { marginTop: '8px' } }, 'Amparos'),
          table([{ t: 'Código', f: a => a.cod }, { t: 'Amparo', f: a => m.amparos.find(x => x.cod === a.cod)?.nombre || '—' }, { t: 'Tipo', k: 'tipoAmparo' }, { t: 'Tipo de valor', f: a => a.tipoValorAsegurado }, { t: 'Valor asegurado', cls: 'r', f: (a) => c ? (a.tipoAmparo === 'Asistencia' ? 'Asistencia incluida' : money(c.amparos[pl.amparos.indexOf(a)]?._calc.valorAsegurado)) : h('span', { class: 'muted small' }, 'Se calcula al guardar') }, { t: 'Prima', cls: 'r', f: a => c ? money(c.amparos[pl.amparos.indexOf(a)]?._calc.prima) : h('span', { class: 'muted small' }, 'Se calcula al guardar') }, { t: 'Edades (mín/máx/perm.)', f: a => `${a.edadMinIngreso ?? '?'} / ${a.edadMaxIngreso ?? '?'} / ${a.edadMaxPermanencia ?? '?'}` },
            { t: '', f: a => ro ? '' : h('div', { class: 'rowact' }, btn('Editar', () => editarAmparo(pl, a, pr), 'sm'), btn('Quitar', () => { pl.amparos.splice(pl.amparos.indexOf(a), 1); pintarProd(); }, 'sm')) }], pl.amparos, { empty: 'Sin amparos: agregue al menos uno Básico' }), ro ? null : h('div', { style: { marginTop: '8px' } }, btn('+ Agregar amparo', () => editarAmparo(pl, null, pr), 'sm'))));
      };
      const editarAmparo = (pl, original, pr) => {
        const a = original ? clon(original) : { tipoAmparo: pl.amparos.length ? 'Adicional' : 'Básico', tipoValorAsegurado: 'SUMA_INFORMADA', edadMinIngreso: 18, edadMaxIngreso: 65, edadMaxPermanencia: 70 }; const cuerpoM = h('div'); let fm;
        const dib = () => {
          clear(cuerpoM); const cat = m.amparos.find(x => x.cod === a.cod);
          cuerpoM.append(h('div', { class: 'note' }, 'Edades por defecto de prueba (18 / 65 / 70): la tabla «Edades por amparo y producto» no estaba disponible (brecha G-02).'), h('div', { class: 'frm' },
            fm.select('cod', 'Amparo', m.amparos.filter(x => !x.inh || x.cod === a.cod).map(x => ({ v: x.cod, t: `${x.cod} · ${x.nombre}${x.inh ? ' (inhabilitado)' : ''}` })), { req: true, disabled: !!original, hint: original ? 'Para cambiar de amparo, quite este y agregue otro.' : null }), fm.select('tipoAmparo', 'Tipo de amparo', m.tiposAmparo, { req: true }),
            a.tipoAmparo === 'Asistencia' ? fm.select('proveedor', 'Proveedor de la asistencia', m.proveedores, { req: true }) : null, fm.select('tipoValorAsegurado', 'Tipo de valor asegurado', [{ v: 'SUMA_INFORMADA', t: 'Suma informada' }, { v: 'N_SMMLV', t: 'N° de SMMLV' }, { v: 'MULTIPLO_SUELDO', t: 'Múltiplo de sueldo' }], { req: true }),
            a.tipoValorAsegurado === 'SUMA_INFORMADA' ? fm.num('valorAseguradoIndividual', 'Valor asegurado individual', { req: true, hint: a.tipoAmparo === 'Asistencia' ? 'Para asistencia puede ser $0 (la carátula dirá «Asistencia Incluida»)' : null }) : null,
            a.tipoValorAsegurado !== 'SUMA_INFORMADA' ? fm.num('factorMultiplicador', 'Factor multiplicador', { req: true }) : null, a.tipoValorAsegurado === 'MULTIPLO_SUELDO' ? fm.num('salarioPromedio', 'Salario promedio', { req: true }) : null,
            fm.num('edadMinIngreso', 'Edad mínima de ingreso', { req: true }), fm.num('edadMaxIngreso', 'Edad máxima de ingreso', { req: true }), fm.num('edadMaxPermanencia', 'Edad máxima de permanencia', { req: true }),
            fm.num('primaComercial', 'Prima comercial', { hint: 'Excluyente con la tasa' }), fm.num('tasaComercial', 'Tasa comercial (por mil)', { hint: 'Supuesto S-01 · excluyente con la prima' }),
            cat?.restablece ? fm.select('limiteValorAsegurado', 'Límite de valor asegurado', ['Valor asegurado', 'Restablecimiento']) : null, cat?.restablece && radicada() ? fm.select('restablecimiento.modo', 'Restablecimiento', [{ v: 'SIN', t: 'Sin restablecimiento' }, { v: 'N_EVENTOS', t: 'Limitado a n eventos' }]) : null, a.restablecimiento?.modo === 'N_EVENTOS' ? fm.num('restablecimiento.n', 'Número de eventos') : null,
            fm.select('carencia', 'Carencia', ['No aplica', 'Aplica']), a.carencia === 'Aplica' ? fm.num('diasCarencia', 'Días de carencia', { req: true }) : null, fm.num('periodicidadCobertura', 'Periodicidad de cobertura'), fm.select('unidadPeriodicidad', 'Unidad de la periodicidad', ['Días', 'Meses', 'No aplica']),
            fm.select('deducible', 'Deducible', ['No aplica', 'Aplica']), a.deducible === 'Aplica' ? [fm.select('unidadDeducible', 'Unidad del deducible', ['Días', 'Meses', 'Valor'], { req: true }), fm.num('valorDeducible', 'Valor del deducible', { req: true })] : null));
        };
        fm = form(a, { onChange: p => { if (['tipoAmparo', 'tipoValorAsegurado', 'cod', 'carencia', 'deducible', 'restablecimiento.modo'].includes(p)) dib(); } }); dib();
        modal({ title: original ? 'Editar amparo' : 'Agregar amparo', body: cuerpoM, wide: true, actions: [{ label: 'Cancelar' }, { label: 'Guardar amparo', cls: 'primary', onclick: () => { if (original) Object.assign(original, a); else pl.amparos.push(a); pintarProd(); } }] });
      };
      pintarProd();
      return card('Productos, planes y amparos (HU255 · HU647)', h('div', null, errs('productos'), caja, pie('productos', () => d)));
    },
    asegurados() {
      const ro = !editable('asegurados'); const planes = s.planes; const caja = h('div'); const res = h('div'); const nuevo = { tipoDoc: 'CC', planId: planes[0]?.id || '' }; const f = form(nuevo);
      const mostrar = r => { clear(res); res.append(h('h4', null, `Resultado del cargue: ${r.exitosos} correctos, ${r.fallidos} con error`), table([{ t: 'Fila', k: 'fila' }, { t: 'Registro', f: x => chip(x.registro) }, { t: 'Observaciones', f: x => (x.observaciones || []).join(' · ') || '—' }], r.resultado)); };
      const nombreCol = ['tipoDoc', 'numDoc', 'primerNombre', 'primerApellido', 'fechaNacimiento', 'direccion', 'ciudad', 'departamento', 'correo', 'telefono'];
      const area = h('textarea', { rows: 5, placeholder: nombreCol.join(';') + '\nCC;2000000101;Ana;Prueba;1990-03-04;Calle 1;Bogotá;Cundinamarca;ana@x.com;3001112233' });
      const filasCsv = () => area.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).filter(l => !l.toLowerCase().startsWith('tipodoc')).map(l => { const c = l.split(';'); return Object.fromEntries(nombreCol.map((k, i) => [k, (c[i] || '').trim()])); });
      const lista = () => { clear(caja); caja.append(table([{ t: 'Documento', f: a => `${a.tipoDoc} ${a.numDoc}` }, { t: 'Nombre', f: a => [a.primerNombre, a.segundoNombre, a.primerApellido, a.segundoApellido].filter(Boolean).join(' ') }, { t: 'Nacimiento', k: 'fechaNacimiento' }, { t: 'Plan', f: a => planes.find(p => p.id === a.planId)?.nombre || '—' }, { t: 'Correo', k: 'correo' }, { t: 'Dirección', k: 'direccion' }, { t: '', f: a => ro ? '' : btn('Quitar', () => run(async () => { s = await DEL(`/solicitudes/${id}/asegurados/${a.id}`); pintar(); }), 'sm') }], s.asegurados, { empty: 'Aún no hay asegurados' })); };
      lista();
      const agregar = async () => { const r = await run(() => POST(`/solicitudes/${id}/asegurados`, nuevo), 'Asegurado agregado'); if (r) { await refrescar(); } };
      return card('Grupo asegurable · cargue de asegurados (HU192/HU193)', h('div', null, errs('asegurados'), h('div', { class: 'note' }, 'HU192/HU193 no estaban disponibles (brecha G-10). La edad se valida contra el amparo básico del plan (HU647): por encima del máximo se rechaza; por debajo del mínimo se acepta y exige autorización de política. Los datos de la DIAN (dirección, ciudad, correo, teléfono) se exigen al facturar.'),
        planes.length ? null : h('div', { class: 'note warn' }, 'Defina primero el producto y los planes: cada asegurado se asigna a un plan.'), caja,
        ro || !planes.length ? null : h('div', null, h('div', { class: 'sec' }, 'Agregar un asegurado'), h('div', { class: 'frm' }, f.select('tipoDoc', 'Tipo de documento', m.tiposDoc, { req: true }), f.text('numDoc', 'Número de documento', { req: true }), f.text('primerNombre', 'Primer nombre', { req: true }), f.text('segundoNombre', 'Segundo nombre'), f.text('primerApellido', 'Primer apellido', { req: true }), f.text('segundoApellido', 'Segundo apellido'),
          f.date('fechaNacimiento', 'Fecha de nacimiento', { req: true }), f.select('planId', 'Plan', planes.map(p => ({ v: p.id, t: p.nombre })), { req: true }), f.text('direccion', 'Dirección fiscal (DIAN)'), f.text('ciudad', 'Ciudad'), f.text('departamento', 'Departamento'), f.text('correo', 'Correo electrónico'), f.text('telefono', 'Teléfono')),
          h('div', { class: 'rowact', style: { marginTop: '10px' } }, btn('Consultar Registraduría (simulada)', async () => { if (!nuevo.numDoc) return toast('Digite el número de documento', 'warn'); const r = await run(() => GET(`/registraduria/${nuevo.tipoDoc}/${nuevo.numDoc}`)); if (r?.encontrado) { Object.assign(nuevo, r); toast('Datos traídos de la Registraduría simulada'); pintar(); } else if (r) toast('No hay datos en la Registraduría simulada para ese documento (use 1010101010, 1020202020, 1030303030…)', 'warn'); }), btn('Agregar asegurado', agregar, 'primary')),
          h('div', { class: 'sec' }, 'Cargue masivo (pegue filas separadas por «;»)'), area, h('div', { class: 'rowact', style: { marginTop: '8px' } }, btn('Descargar plantilla', () => csvDownload('plantilla_asegurados.csv', [nombreCol, ['CC', '2000000101', 'Ana', 'Prueba', '1990-03-04', 'Calle 1', 'Bogotá', 'Cundinamarca', 'ana@x.com', '3001112233']])), btn('Cargar filas', async () => { const filas = filasCsv(); if (!filas.length) return toast('Pegue al menos una fila', 'warn'); const r = await run(() => POST(`/solicitudes/${id}/asegurados/cargue`, { filas })); if (r) { s = r.solicitud; mostrar(r); lista(); } }, 'primary')), res)));
    },
    siniestralidad() {
      const d = clon(s.siniestralidad) || { tuvoReclamaciones: false, vida: [], arl: [] }; d.vida ||= []; d.arl ||= []; const ro = !editable('siniestralidad'); const f = form(d, { onChange: p => { if (p === 'tuvoReclamaciones') dib(); } }); const caja = h('div');
      const bloque = (clave, titulo, habilitado) => { const c = h('div'); c.append(h('h4', null, titulo, habilitado ? '' : h('span', { class: 'chip muted', style: { marginLeft: '8px' } }, 'Deshabilitada'))); d[clave].forEach((r, i) => c.append(h('div', { class: 'frm', style: { marginBottom: '8px', opacity: habilitado ? 1 : .5 } }, f.date(`${clave}.${i}.inicio`, 'Inicio de vigencia', { disabled: ro || !habilitado }), f.date(`${clave}.${i}.fin`, 'Fin de vigencia', { disabled: ro || !habilitado }), f.num(`${clave}.${i}.cantidad`, 'Cantidad de siniestros', { disabled: ro || !habilitado }), f.text(`${clave}.${i}.amparo`, 'Amparo afectado', { disabled: ro || !habilitado }), f.num(`${clave}.${i}.valor`, 'Valor de la reclamación', { disabled: ro || !habilitado }), f.text(`${clave}.${i}.adjunto`, 'Adjunto (nombre de archivo Excel)', { disabled: ro || !habilitado }), ro || !habilitado ? null : h('div', { style: { alignSelf: 'end' } }, btn('Quitar', () => { d[clave].splice(i, 1); dib(); }, 'sm'))))); if (habilitado && !ro) c.append(btn('+ Agregar siniestro', () => { d[clave].push({}); dib(); }, 'sm')); return c; };
      const dib = () => { clear(caja); caja.append(h('div', { class: 'frm' }, f.bool('tuvoReclamaciones', '¿Ha tenido reclamaciones de seguros en los últimos 5 años (con cualquier aseguradora)?', { req: true, disabled: ro })), bloque('vida', 'Siniestralidad vida', d.tuvoReclamaciones === true), bloque('arl', 'Siniestralidad riesgos laborales (ARL Positiva)', !!s.generales.afiliadoARL)); }; dib();
      return card('Siniestralidad (HU195)', h('div', null, errs('siniestralidad'), caja, pie('siniestralidad', () => d)));
    },
    sarlaft() {
      const d = clon(s.sarlaft) || { completo: false }; const f = form(d), ro = !editable('sarlaft');
      return card('SARLAFT', h('div', null, h('div', { class: 'note sim' }, 'El formulario SARLAFT (HU487) no estaba disponible: se modela como indicador «completo / incompleto». Si está incompleto, la política «Faltan datos SARLAFT» exige al Oficial de Cumplimiento. La consulta de listas restrictivas es un servicio simulado que se ejecuta al emitir (use un documento terminado en 666 para provocar coincidencia).'),
        h('div', { class: 'frm' }, f.check('completo', 'Formulario SARLAFT completo', { disabled: ro }), f.text('actividadEconomica', 'Actividad económica', { disabled: ro }), f.text('origenFondos', 'Origen de fondos', { disabled: ro }), f.num('ingresosMensuales', 'Ingresos mensuales', { disabled: ro })), pie('sarlaft', () => d, { sinContinuar: false })));
    },
    estudio() {
      if (s.estado === 'BORRADOR') return card('Estudio técnico', h('div', { class: 'note' }, 'El estudio técnico se habilita al radicar la solicitud (HU207). Complete las secciones y radique desde «Resumen y emisión».'));
      const d = clon(s.costos) || {}; const ro = !editable('estudio'); const f = form(d, { onChange: () => {} });
      const pol = s.politicas || [];
      const resolver = (p, accion) => { const o = { observacion: '', valorEsperado: '' }; const fo = form(o); modal({ title: `${accion === 'autorizar' ? 'Autorizar' : 'Rechazar'} política ${p.id}`, body: h('div', null, h('p', null, h('b', null, p.nombre), ` · ${p.variable}: ${p.valor} (rango permitido: ${p.rango})`), h('p', { class: 'muted small' }, `Nivel requerido: ${p.nivelRequerido}. Su nivel: ${state.user.nivel}.`), ['P05', 'P06'].includes(p.id) && accion === 'autorizar' ? fo.num('valorEsperado', 'Valor esperado (reemplaza el valor actual)') : null, fo.area('observacion', 'Observaciones')),
        actions: [{ label: 'Cancelar' }, { label: accion === 'autorizar' ? 'Autorizar' : 'Rechazar', cls: accion === 'autorizar' ? 'primary' : 'danger', onclick: () => run(async () => { await POST(`/solicitudes/${id}/politicas/${p.id}/${accion}`, o); await refrescar(); }, accion === 'autorizar' ? 'Política autorizada' : 'Política rechazada') }] }); };
      return h('div', null, card('Costos asociados a la póliza (Factor G · HU207)', h('div', null, h('div', { class: 'frm' }, f.num('gastosAdmin', 'Gastos de administración (nota técnica) %', { req: true, disabled: ro, hint: 'Predefinido 15 %' }), f.num('gastosReaseguro', 'Gastos de reaseguro %', { disabled: ro }), f.num('comision', 'Comisión %', { disabled: ro, req: s.generales.intermediada }), f.num('ivaComision', 'IVA comisión % (fijo)', { disabled: true }),
        s.generales.requiereRetorno ? [f.select('tipoRetorno', 'Tipo de retorno', ['Porcentaje sobre primas recaudadas', 'Valor unitario de retorno por asegurado'], { disabled: ro }), f.num('valorRetorno', 'Valor del retorno', { disabled: ro }), f.num('ivaRetorno', 'IVA retorno % (fijo)', { disabled: true })] : null, f.num('gastosComerciales', 'Gastos comerciales %', { disabled: ro }), f.num('utilidad', 'Utilidad %', { req: true, disabled: ro, hint: 'Predefinido 5 %' }), f.num('otrosGastos', 'Otros gastos %', { disabled: ro }), h('div', { class: 'fld' }, h('span', { class: 'lbl' }, '% siniestralidad (subtotal)'), h('b', { style: { fontSize: '20px' } }, `${s.subtotalCostos} %`), h('small', { class: 'hint' }, 'Supuesto S-04: los IVA se aplican sobre comisión y retorno.'))),
        ro ? null : h('div', { class: 'rowact', style: { marginTop: '12px' } }, btn('Guardar costos', () => guardar('costos', d, false), 'primary')))),
      card('Políticas de suscripción · autorizaciones para suscribir', h('div', null, pol.length ? null : h('div', { class: 'note ok' }, 'Ninguna política se dispara con los datos actuales: la solicitud puede emitirse.'),
        table([{ t: 'Política', f: p => h('span', null, h('b', null, p.id), ' ', p.nombre) }, { t: 'Variable', k: 'variable' }, { t: 'Valor superado', k: 'valor' }, { t: 'Rango permitido', k: 'rango' }, { t: 'Nivel requerido', k: 'nivelRequerido' }, { t: 'Estado', f: p => chip(p.estado) }, { t: 'Resolvió', f: p => p.autorizadoPor ? `${p.autorizadoPor} (${p.fechaResolucion})` : '—' }, { t: '', f: p => p.estado === 'Pendiente' && !cerrada() ? h('div', { class: 'rowact' }, btn('Autorizar', () => resolver(p, 'autorizar'), 'primary sm'), btn('Rechazar', () => resolver(p, 'rechazar'), 'sm')) : '' }], pol, { empty: 'Sin políticas por evaluar' }),
        h('p', { class: 'muted small', style: { marginTop: '10px' } }, 'Umbrales: ver Configuración (cada uno indica si es [COD] del código existente o [TEST] de prueba). Las notificaciones a los usuarios con el nivel requerido aparecen en la campana superior.'))));
    },
    resumen() {
      const secs = visibles().filter(k => !['estudio', 'resumen'].includes(k)); const c = s.calculo;
      const emitir = async () => { const r = await run(() => POST(`/solicitudes/${id}/emitir`)); if (!r) return; if (r.rechazada) { toast(r.motivo, 'bad'); await refrescar(); } else { toast(`Póliza ${r.poliza.numero} emitida`); location.hash = `#/poliza/${r.poliza.id}`; } };
      return h('div', null, card('Validación por sección', h('div', null, secs.map(k => h('div', { style: { margin: '6px 0' } }, chip(errDe(k).length ? 'Pendiente' : 'Correcto', errDe(k).length ? 'warn' : 'ok'), ' ', h('b', null, ETIQ[k]), errDe(k).length ? h('span', { class: 'muted small' }, ` — ${errDe(k).length} observación(es): ${errDe(k).slice(0, 2).map(e => e.mensaje).join(' · ')}`) : null)))),
        card('Liquidación de la solicitud', h('div', null, kv([['Prima total de la vigencia', money(c.primaTotal)], ['Asegurados considerados', c.nTotalAsegurados], ['Valor asegurado máximo por persona', money(c.vaMaxPorPersona)], ['% siniestralidad (subtotal)', `${s.subtotalCostos} %`]], 4), table([{ t: 'Plan', k: 'nombre' }, { t: 'Asegurados', k: 'nAsegurados', cls: 'r' }, { t: 'Prima por asegurado', cls: 'r', f: p => money(p.primaPorAsegurado) }, { t: 'Prima total', cls: 'r', f: p => money(p.primaTotalPlan) }], c.planes))),
        card('Acciones', h('div', { class: 'rowact' }, s.estado === 'BORRADOR' ? btn('Radicar solicitud', () => run(async () => { await POST(`/solicitudes/${id}/radicar`); await refrescar('estudio'); }, 'Solicitud radicada: genera código único'), 'primary') : null,
          radicada() ? btn('Emitir póliza', emitir, 'primary') : null, radicada() && !s.puedeEmitir ? h('span', { class: 'chip warn' }, 'Hay políticas sin autorizar') : null, s.estado === 'BORRADOR' ? btn('Eliminar borrador', () => modal({ title: 'Eliminar solicitud', body: h('p', null, '¿Eliminar este borrador?'), actions: [{ label: 'Cancelar' }, { label: 'Eliminar', cls: 'danger', onclick: () => run(async () => { await DEL(`/solicitudes/${id}`); location.hash = '#/solicitudes'; }, 'Solicitud eliminada') }] })) : null,
          s.polizaId ? link(`Ir a la póliza ${s.polizaId}`, `#/poliza/${s.polizaId}`) : null)),
        card('Historial de la solicitud', h('ul', { class: 'timeline' }, [...s.historial].reverse().map((e, i) => h('li', { class: i === 0 ? 'first' : '' }, e.evento, h('br'), h('small', { class: 'muted' }, `${e.usuario} · ${e.fecha}`))))));
    },
  };
  el.append(h('div', { class: 'toolbar' }, link('← Solicitudes', '#/solicitudes')), h('div', { class: 'split' }, card(null, nav), cuerpo));
  pintar();
}
