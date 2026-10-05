import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';

// Nunito — rounded, friendly and geometric like the cut-paper shapes on the
// reference sheets; ships Latin Extended, so Slovak diacritics render.
// Panels are painted onto canvases once, so the faces must be loaded first.
export const FONT_FAMILY = 'Nunito';

export function loadFonts() {
  if (!document.fonts?.load) return Promise.resolve();
  const sample = 'Aa Šč ŽÝ ôä 0123';
  const loads = [400, 600, 700, 800, 900].map((w) => document.fonts.load(`${w} 32px ${FONT_FAMILY}`, sample));
  const timeout = new Promise((resolve) => { setTimeout(resolve, 4000); });
  return Promise.race([Promise.all(loads), timeout]).catch(() => {});
}
