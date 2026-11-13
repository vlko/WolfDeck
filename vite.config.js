import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';

// Keeps src/models/packs.json (model → pack, read by the lazy model loader)
// in step with the model files: on start, on build, and on every edit.
function modelIndex() {
  const run = () => {
    try {
      execFileSync(process.execPath, ['tools/gen-model-index.mjs'], { stdio: ['ignore', 'inherit', 'pipe'] });
    } catch (err) {
      console.warn(`[model-index] not updated: ${String(err.stderr ?? err).trim().split('\n').pop()}`);
    }
  };
  return {
    name: 'wolfdeck-model-index',
    buildStart: run,
    configureServer(server) {
      const onFile = (f) => { if (/src[\\/]models[\\/][^\\/]+\.js$/.test(f)) run(); };
      server.watcher.on('change', onFile).on('add', onFile).on('unlink', onFile);
    },
  };
}

export default defineConfig({
  // Emit relative asset URLs (./assets/…) so the built site works when served
  // from any subfolder, resolving against the current document URL.
  base: './',
  plugins: [modelIndex()],
  // Two pages: the deck, and the presenter's window it opens (F).
  build: { rollupOptions: { input: { main: 'index.html', presenter: 'presenter.html' } } },
  server: {
	host: true, // bind 0.0.0.0 so Docker port mappings can reach the server
    port: 3000,
    // Reliable change detection on WSL2 / network filesystems.
    watch: { usePolling: true, interval: 300 },
  },
});
