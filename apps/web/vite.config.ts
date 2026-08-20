import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // Tailwind's plugin must run before the Svelte plugin so it can transform `<style>` blocks
  // and `.css` imports before svelte-vite-plugin processes component files.
  //
  // `optimize: false`: with rolldown-vite (this project's Vite 8), @tailwindcss/vite's own
  // internal minification pass runs a separate lightningcss invocation that doesn't know about
  // Tailwind's own at-rules (`@theme`, etc.), producing spurious "Unknown at rule" warnings and
  // leaving those rules unprocessed in the output. Disabling it is the documented workaround —
  // Vite's own build-time minification still runs afterward, so output size is unaffected; see
  // https://github.com/tailwindlabs/tailwindcss/discussions/19530.
  plugins: [tailwindcss({ optimize: false }), sveltekit()],
});
