// Utilidades de fechas (YYYY-MM-DD), dinero y errores de negocio. Sin dependencias.
export class BizError extends Error {
  constructor(message, { code = 'REGLA_NEGOCIO', status = 400, detalle = null } = {}) {
    super(message); this.code = code; this.status = status; this.detalle = detalle;
  }
}
export const fail = (m, o) => { throw new BizError(m, o); };

const pad = n => String(n).padStart(2, '0');
export const isYmd = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(toUtc(s));
export const toUtc = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const fmt = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const addDays = (s, n) => { const d = toUtc(s); d.setUTCDate(d.getUTCDate() + n); return fmt(d); };
export const addMonths = (s, n) => {
  const [y, m, day] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last)); return fmt(t);
};
export const diffDays = (a, b) => Math.round((toUtc(b) - toUtc(a)) / 86400000);
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export function edadA(fechaNac, fecha) {
  const n = toUtc(fechaNac), f = toUtc(fecha);
  let e = f.getUTCFullYear() - n.getUTCFullYear();
  if (f.getUTCMonth() < n.getUTCMonth() || (f.getUTCMonth() === n.getUTCMonth() && f.getUTCDate() < n.getUTCDate())) e--;
  return e;
}
export const money = v => Math.round((Number(v) || 0) * 100) / 100;          // 2 decimales HALF_UP (como el código real)
export const num = v => (v === '' || v == null ? null : Number(v));
export const isNum = v => v !== '' && v != null && !isNaN(Number(v));
export const has = v => v !== undefined && v !== null && String(v).trim() !== '';
export const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
export const COP = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(v || 0);
