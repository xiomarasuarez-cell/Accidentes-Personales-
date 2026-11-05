// Composición de la aplicación: store → ctx → facturación → pólizas → solicitudes.
import { openStore } from './store.mjs';
import { createCtx } from './ctx.mjs';
import { createFacturacion } from './facturacion.mjs';
import { createPolizas } from './polizas.mjs';
import { createSolicitudes } from './solicitudes.mjs';
import { rankNivel } from './catalog.mjs';

export function createCore(dbFile) {
  const store = openStore(dbFile);
  const ctx = createCtx(store);
  const acc = { get: id => store.col('polizas').get(id), put: p => store.col('polizas').put(p) };
  const fact = createFacturacion(ctx, acc);
  const pol = createPolizas(ctx, fact);
  const sol = createSolicitudes(ctx, pol);

  /** Notificaciones visibles para un usuario (directas o dirigidas a un nivel mínimo de autorización). */
  const notificaciones = user => store.col('notificaciones').all().filter(n =>
    typeof n.para === 'string' ? n.para === user.id : (n.para?.nivelMin && !['Usuario tercero', 'Intermediario'].includes(user.rol) && (n.para.nivelMin === 'Oficial Cumplimiento' ? user.nivel === 'Oficial Cumplimiento' : rankNivel(user.nivel) >= rankNivel(n.para.nivelMin))))
    .sort((a, b) => b.id.localeCompare(a.id));

  const dashboard = () => {
    const sols = store.col('solicitudes').all(), pols = pol.listar(), recs = fact.listarRecibos(), facs = fact.listarFacturas();
    const cuenta = (arr, f) => arr.filter(f).length;
    return {
      solicitudes: { total: sols.length, borrador: cuenta(sols, s => s.estado === 'BORRADOR'), enEstudio: cuenta(sols, s => ['RADICADA', 'EN_ESTUDIO'].includes(s.estado)), emitidas: cuenta(sols, s => s.estado === 'EMITIDA'), rechazadas: cuenta(sols, s => s.estado === 'RECHAZADA'),
        politicasPendientes: sols.reduce((n, s) => n + (s.politicas || []).filter(p => p.estado === 'Pendiente').length, 0) },
      polizas: { total: pols.length, vigentes: cuenta(pols, p => p.estado === 'VIGENTE'), anuladas: cuenta(pols, p => p.estado === 'ANULADA'), primaVigente: pols.filter(p => p.estado === 'VIGENTE').reduce((s, p) => s + p.prima, 0) },
      facturacion: { facturas: cuenta(facs, f => f.tipo === 'FACTURA'), notasCredito: cuenta(facs, f => f.tipo === 'NOTA_CREDITO'), ajustes: cuenta(facs, f => f.tipo === 'AJUSTE'), facturado: facs.reduce((s, f) => s + f.total, 0) },
      recibos: { pendiente: cuenta(recs, r => r.estado === 'PENDIENTE'), parcial: cuenta(recs, r => r.estado === 'PARCIAL'), enMora: cuenta(recs, r => r.estado === 'EN_MORA'), legalizado: cuenta(recs, r => r.estado === 'LEGALIZADO'), anulado: cuenta(recs, r => r.estado === 'ANULADO'),
        saldoPendiente: recs.filter(r => !r.esNegativo && !['ANULADO', 'LEGALIZADO'].includes(r.estado)).reduce((s, r) => s + r.saldo, 0) },
      autorizacionesPendientes: pol.listarAutorizaciones().filter(a => a.estado === 'PENDIENTE').length,
      porFacturar: pols.filter(p => p.estado === 'VIGENTE').filter(p => fact.estado(p.id).siguiente).length,
      reloj: ctx.hoy(),
    };
  };
  return { store, ctx, fact, pol, sol, notificaciones, dashboard };
}
