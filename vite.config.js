import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        blog: fileURLToPath(new URL('./blog.html', import.meta.url)),
      },
    },
  },
  plugins: [{
    name: 'admin-directory-index',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] === '/admin' || request.url?.split('?')[0] === '/admin/') request.url = '/admin/index.html';
        next();
      });
    },
  }],
});
