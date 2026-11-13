// Readable text of a panel — what the presenter view lists under "next".
// One short line per thing the audience will read; numbers of a chart are
// left out, its labels are enough to remember what comes.

const str = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
const join = (...xs) => xs.map(str).filter(Boolean).join(' — ');

export function partLines(part) {
  const p = part ?? {};
  const out = [];
  const add = (...xs) => { const l = join(...xs); if (l) out.push(l); };

  switch (p.type) {
    case 'bullets':
      add(p.title);
      (Array.isArray(p.items) ? p.items : []).forEach((it) => add(typeof it === 'object' ? it?.text ?? it?.title : it));
      break;
    case 'numbered':
      add(p.title);
      (Array.isArray(p.items) ? p.items : []).forEach((it, i) => {
        const l = typeof it === 'object' ? join(it?.title, it?.text) : str(it);
        if (l) out.push(`${i + 1}. ${l}`);
      });
      break;
    case 'stat':
      add(p.value, p.label);
      add(p.note);
      break;
    case 'table':
      add(p.title);
      if (Array.isArray(p.columns)) add(p.columns.map(str).filter(Boolean).join(' · '));
      (Array.isArray(p.rows) ? p.rows : []).forEach((r) => {
        if (Array.isArray(r)) add(r.map(str).filter(Boolean).join(' · '));
      });
      break;
    case 'image':
      add(p.caption || 'Obrázok');
      break;
    case 'chart': {
      const labels = Array.isArray(p.labels) ? p.labels
        : (Array.isArray(p.data) ? p.data.map((d) => d?.label) : []);
      const series = Array.isArray(p.series) ? p.series.map((s) => s?.name) : [];
      add(p.title || p.centerLabel || 'Graf');
      add(labels.map(str).filter(Boolean).join(' · '));
      add(series.map(str).filter(Boolean).join(' · '));
      break;
    }
    default: // text, callout and anything unknown
      add(p.title);
      add(p.body ?? p.text);
  }
  return out;
}
