// Persistencia: SQLite embebido (node:sqlite). Documentos JSON por colección con caché en memoria
// y transacciones de unidad de trabajo (si una operación falla, no se persiste NADA).
import { DatabaseSync } from 'node:sqlite';
import { clone } from './util.mjs';

export function openStore(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (col, id))');
  db.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
  const cache = new Map();           // col -> Map(id -> obj)
  let pending = null;                // { docs: Map('col\u0000id' -> obj|null), kv: Map }

  const load = col => {
    if (!cache.has(col)) {
      const m = new Map();
      for (const r of db.prepare('SELECT id, json FROM docs WHERE col = ?').all(col)) m.set(r.id, JSON.parse(r.json));
      cache.set(col, m);
    }
    return cache.get(col);
  };
  const key = (c, i) => `${c}\u0000${i}`;

  const store = {
    col(name) {
      return {
        get: id => {
          if (pending?.docs.has(key(name, id))) { const v = pending.docs.get(key(name, id)); return v ? clone(v) : undefined; }
          const v = load(name).get(id); return v ? clone(v) : undefined;
        },
        all: () => {
          const base = new Map(load(name));
          if (pending) for (const [k, v] of pending.docs) { const [c, i] = k.split('\u0000'); if (c === name) v ? base.set(i, v) : base.delete(i); }
          return [...base.values()].map(clone);
        },
        put: obj => {
          if (!obj.id) throw new Error(`doc sin id en ${name}`);
          const v = clone(obj);
          if (pending) pending.docs.set(key(name, obj.id), v);
          else { load(name).set(obj.id, v); db.prepare('INSERT OR REPLACE INTO docs (col, id, json) VALUES (?, ?, ?)').run(name, obj.id, JSON.stringify(v)); }
          return obj;
        },
        /** Escritura inmediata, FUERA de la transacción en curso (bitácoras que deben sobrevivir a un rollback). */
        putDirect: obj => { const v = clone(obj); load(name).set(obj.id, v); db.prepare('INSERT OR REPLACE INTO docs (col, id, json) VALUES (?, ?, ?)').run(name, obj.id, JSON.stringify(v)); return obj; },
        del: id => {
          if (pending) pending.docs.set(key(name, id), null);
          else { load(name).delete(id); db.prepare('DELETE FROM docs WHERE col = ? AND id = ?').run(name, id); }
        },
      };
    },
    kvGet(k, def = null) {
      if (pending?.kv.has(k)) return pending.kv.get(k);
      const r = db.prepare('SELECT v FROM kv WHERE k = ?').get(k);
      return r ? JSON.parse(r.v) : def;
    },
    kvSet(k, v) {
      if (pending) pending.kv.set(k, v);
      else db.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)').run(k, JSON.stringify(v));
    },
    seqDirect(name) { const r = db.prepare('SELECT v FROM kv WHERE k = ?').get('seq:' + name); const n = (r ? JSON.parse(r.v) : 0) + 1; db.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)').run('seq:' + name, JSON.stringify(n)); return n; },
    seq(name) { const n = (store.kvGet('seq:' + name, 0) || 0) + 1; store.kvSet('seq:' + name, n); return n; },
    /** Unidad de trabajo atómica: confirma todo o descarta todo. */
    tx(fn) {
      if (pending) return fn();                       // anidada: participa de la transacción externa
      pending = { docs: new Map(), kv: new Map() };
      try {
        const out = fn();
        const p = pending; pending = null;
        db.exec('BEGIN');
        try {
          for (const [k, v] of p.docs) {
            const [c, i] = k.split('\u0000');
            if (v) { load(c).set(i, v); db.prepare('INSERT OR REPLACE INTO docs (col, id, json) VALUES (?, ?, ?)').run(c, i, JSON.stringify(v)); }
            else { load(c).delete(i); db.prepare('DELETE FROM docs WHERE col = ? AND id = ?').run(c, i); }
          }
          for (const [k, v] of p.kv) db.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)').run(k, JSON.stringify(v));
          db.exec('COMMIT');
        } catch (e) { db.exec('ROLLBACK'); cache.clear(); throw e; }
        return out;
      } catch (e) { pending = null; throw e; }
    },
    reset() { pending = null; cache.clear(); db.exec('DELETE FROM docs; DELETE FROM kv;'); },
    close() { db.close(); },
  };
  return store;
}
