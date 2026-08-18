<script>
  // Injected by scripts/inject-spike.mjs from the hello-core registry entry; not present
  // until the spike has run at least once.
  import { helloModularCore } from './modularcore/hello-core/hello.ts';

  const message = helloModularCore('Svelte fixture');
</script>

<pre>{message}</pre>
