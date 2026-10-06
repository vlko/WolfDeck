import * as THREE from 'three';

// Creates a WebGLRenderer, stepping down to plainer context settings when the
// browser refuses the first ones. Firefox on some drivers (WSL, VMs, Linux
// with EGL) fails with FEATURE_FAILURE_EGL_NO_CONFIG when asked for an
// antialiased (MSAA) or alpha framebuffer, yet happily gives a plain one.
// Throws WebGLUnavailable when no variant works.
export class WebGLUnavailable extends Error {}

export function createWebGLRenderer(params = {}) {
  const variants = [
    params,
    { ...params, antialias: false },
    { ...params, antialias: false, alpha: false, stencil: false, powerPreference: 'default' },
    { ...params, antialias: false, alpha: false, stencil: false, depth: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false, precision: 'mediump' },
  ];
  let lastError;
  for (const v of variants) {
    try {
      const renderer = new THREE.WebGLRenderer(v);
      if (v !== params) console.warn('WolfDeck: WebGL started with fallback settings', v);
      return renderer;
    } catch (err) {
      lastError = err;
      // a failed attempt may leave a lost context on a passed-in canvas;
      // three only accepts a fresh one, so give the next try a new canvas
      if (v.canvas) {
        const fresh = v.canvas.cloneNode(false);
        v.canvas.replaceWith(fresh);
        for (const w of variants) if (w.canvas === v.canvas) w.canvas = fresh;
      }
    }
  }
  throw new WebGLUnavailable(lastError?.message ?? 'WebGL is not available');
}

// A friendly full-page notice instead of a blank page.
export function showWebGLError(err) {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;'
    + 'background:#ebe7d7;color:#4a3f33;font:16px/1.5 Nunito,system-ui,sans-serif;padding:24px;z-index:9999';
  const isFirefox = /firefox/i.test(navigator.userAgent);
  box.innerHTML = `<div style="max-width:560px">
    <h2 style="margin:0 0 8px">Prehliadač nevie spustiť 3D (WebGL)</h2>
    <p>Táto prezentácia potrebuje WebGL 2, ale prehliadač ho nedokázal vytvoriť.</p>
    <ul>
      <li>Zapnite hardvérovú akceleráciu v nastaveniach prehliadača a reštartujte ho.</li>
      ${isFirefox ? '<li>Firefox: v <code>about:config</code> nastavte <code>webgl.force-enabled</code> na <code>true</code> (prípadne <code>webgl.disabled</code> na <code>false</code>) a reštartujte.</li>' : ''}
      <li>Alebo skúste Chrome / Edge.</li>
    </ul>
    <details><summary>Technické detaily</summary><pre style="white-space:pre-wrap;font-size:12px">${String(err?.message ?? err).replace(/</g, '&lt;')}</pre></details>
  </div>`;
  document.body.appendChild(box);
}
