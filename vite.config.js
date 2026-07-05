import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const page = (filename) => fileURLToPath(new URL(filename, import.meta.url));

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: page('index.html'),
        chat: page('chat.html'),
        flower: page('flower.html'),
        garden: page('garden.html'),
      },
    },
  },
});
