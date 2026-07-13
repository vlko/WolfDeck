import { defineConfig } from 'vite';

export default defineConfig({
  server: {
	host: true, // bind 0.0.0.0 so Docker port mappings can reach the server
    port: 3000,
    // Reliable change detection on WSL2 / network filesystems.
    watch: { usePolling: true, interval: 300 },
  },
});
