<script lang="ts">
  import { createMediaPicker } from '@modularcore/media-picker/svelte';

  import { createDemoStorageProvider } from '$lib/demo-storage-provider';

  const picker = createMediaPicker();
  // DEMO-only in-memory provider — no real backend/credentials. See
  // apps/web/src/lib/demo-storage-provider.ts for why this is safe to expose publicly.
  const demoProvider = createDemoStorageProvider();

  function handleFileChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) picker.loadLocalFile(file);
  }

  async function handleUpload(): Promise<void> {
    await picker.upload(demoProvider);
  }
</script>

<a href="/">&larr; Volver al catálogo</a>

<h1>Playground: Media Picker</h1>
<p>
  Demo en vivo de <code>@modularcore/media-picker</code> con un <strong>provider de demo</strong>
  en memoria (<code>createDemoStorageProvider</code>): los blobs nunca salen del navegador y no se
  usa ninguna credencial real. En una app real, sustituirías este provider por
  <code>providers/s3-compatible</code> o <code>providers/cloudinary</code>, respaldados por tu
  propio backend de firma.
</p>

<input type="file" accept="image/*" onchange={handleFileChange} />

<p>Estado: {picker.state.status}</p>

{#if picker.state.error}
  <p class="error">{picker.state.error.message}</p>
{/if}

{#if picker.state.blob}
  <button type="button" onclick={handleUpload} disabled={picker.state.status === 'uploading'}>
    Subir (demo)
  </button>
{/if}

{#if picker.state.result}
  <div class="result">
    <p>Subido: <code>{picker.state.result.key}</code></p>
    <img src={picker.state.result.url} alt="Media picker demo upload result" />
  </div>
{/if}

<style>
  .error {
    color: #b00020;
  }
  .result img {
    max-width: 320px;
    display: block;
    margin-top: 0.5rem;
    border-radius: 6px;
  }
</style>
