{{-- Import ./modularcore/media-picker/entry from resources/js/app.js (served with @vite there). --}}
{{-- Do not expose Azure secrets. --}}
<input
  data-modularcore-media-picker
  data-container-url="{{ config('services.azure.container_url') }}"
  data-target-url="{{ route('media.azure-upload-target') }}"
  data-public-url="{{ url('/media') }}"
  type="file"
  accept="image/*"
>
