{{-- Requires the copied Media Picker JavaScript in your Vite entry. Do not expose Azure secrets. --}}
<input id="media-file" type="file" accept="image/*">
<script type="module">
  import { createAzureBlobProvider } from '/resources/js/modularcore/media-picker/providers/azure-blob';

  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  const provider = createAzureBlobProvider({
    containerUrl: '{{ config('services.azure.container_url') }}',
    async getUploadTarget(file, options) {
      const response = await fetch('{{ route('media.azure-upload-target') }}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
        body: JSON.stringify({ contentType: options?.contentType ?? file.type, size: file.size }),
      });
      if (!response.ok) throw new Error('Unable to create upload target');
      return response.json();
    },
    getUrl: (key) => '{{ url('/media') }}/' + encodeURIComponent(key),
  });

  document.querySelector('#media-file').addEventListener('change', async (event) => {
    const file = event.currentTarget.files?.[0];
    if (file) await provider.upload(file);
  });
</script>
