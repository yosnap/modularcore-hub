import { createAzureBlobProvider } from './core/providers/azure-blob.js';

function mountPicker(input: HTMLInputElement): void {
  const containerUrl = input.dataset.containerUrl;
  const targetUrl = input.dataset.targetUrl;
  const publicUrl = input.dataset.publicUrl;
  if (!containerUrl || !targetUrl || !publicUrl) return;

  const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
  const provider = createAzureBlobProvider({
    containerUrl,
    async getUploadTarget(file, options) {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
        body: JSON.stringify({ contentType: options?.contentType ?? file.type, size: file.size }),
      });
      if (!response.ok) throw new Error('Unable to create upload target');
      return response.json();
    },
    getUrl: (key) => `${publicUrl.replace(/\/$/, '')}/${encodeURIComponent(key)}`,
  });

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (file) await provider.upload(file);
  });
}

function mountAllPickers(): void {
  document
    .querySelectorAll<HTMLInputElement>('[data-modularcore-media-picker]')
    .forEach(mountPicker);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAllPickers, { once: true });
} else {
  mountAllPickers();
}
