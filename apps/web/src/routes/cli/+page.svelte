<script lang="ts">
  import { onMount } from 'svelte';

  let registryUrl = $state('https://tu-dominio.example/registry');

  onMount(() => {
    registryUrl = `${window.location.origin}/registry`;
  });
</script>

<a href="/">&larr; Volver al catálogo</a>

<h1>CLI de ModularCore</h1>
<p>
  El CLI instala y mantiene componentes en tu proyecto. El comando habitual es
  <code>modularcore</code>; no es el servidor MCP ni deja un proceso abierto.
</p>

<section>
  <h2>Consulta la ayuda</h2>
  <pre><code>{`modularcore --help
modularcore add --help`}</code></pre>
  <p>
    <code>-h</code> es la forma corta de <code>--help</code>. El primer comando muestra todas las
    opciones; el segundo explica únicamente cómo instalar un componente.
  </p>
</section>

<section>
  <h2>1. Instálalo una vez</h2>
  <pre><code>npm install --global @modularcore/cli@0.2.1</code></pre>
  <p>Esto expone el binario <code>modularcore</code> en tu terminal.</p>
</section>

<section>
  <h2>2. Inicializa el proyecto</h2>
  <pre><code>modularcore init</code></pre>
  <p>
    Ejecutalo desde la raíz del proyecto. Detecta el framework, pregunta las rutas de destino y
    crea <code>modularcore.json</code>. Cuando pida la URL del registry, usa
    <code>{registryUrl}</code>.
  </p>
</section>

<section>
  <h2>3. Descubre e instala</h2>
  <pre><code>{`modularcore list
modularcore search media
modularcore add media-picker`}</code></pre>
  <p>
    <code>add</code> escribe los archivos del componente y registra su estado. Revisa las
    dependencias y las variables nuevas que indique; el CLI no sustituye la revisión del cambio.
  </p>
</section>

<section>
  <h2>Alternativa sin instalación global</h2>
  <p>
    Para probarlo una vez o en automatizaciones, usa <code>npx -y @modularcore/cli@0.2.1</code>
    delante del subcomando. No es la recomendación para el uso cotidiano.
  </p>
</section>

<p>Requiere Node.js 18 o superior.</p>

<style>
  section { margin-top: 2rem; }
  pre { overflow-x: auto; padding: 0.9rem; border-radius: 8px; background: var(--mc-neutral-50); }
</style>
