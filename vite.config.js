import {defineConfig, searchForWorkspaceRoot} from 'vite';

export default defineConfig({
  base: './',
  server: {fs:{allow:[searchForWorkspaceRoot(process.cwd())],deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/.archive/**']}},
  build: {target:'es2020',assetsInlineLimit:0,chunkSizeWarningLimit:650},
});
