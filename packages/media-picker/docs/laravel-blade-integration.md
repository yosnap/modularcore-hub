# Laravel / Blade integration

Copy the Blade and controller snippets into your application, then wire `AzureBlobSasIssuer` to
your server-side Azure identity or SDK. The issuer must authorize the current user and create a
short-lived SAS for one generated blob key. Configure CORS for the precise frontend origin.

After `modularcore init` detects Blade, it writes JavaScript under `resources/js/modularcore`.
Import the generated entry from your normal Vite entry, which your layout must serve with
`@vite('resources/js/app.js')`:

```ts
import './modularcore/media-picker/entry';
```

The entry only sends file metadata and a CSRF token to Laravel; Azure account keys and connection
strings remain server-side.
