// Model packs (one module per reference sheet), in registration order: a
// later pack's model replaces an earlier one of the same name — the
// shared-kit vehicles come last and replace the per-sheet ones.
export const PACK_ORDER = [
  'visual', 'village', 'trees', 'city1', 'city2', 'office', 'shop', 'construction',
  'school', 'sport', 'social', 'services', 'money', 'namestovo', 'extras',
  // CodeCon 2026 deck — objects drawn for it (predloha: tools/sprites-src)
  'codecon-race', 'codecon-cheese', 'codecon-work', 'codecon-fear', 'codecon-learn',
  'codecon-voice', 'codecon-stage',
  'vehicles',
];
