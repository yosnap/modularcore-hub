# Laravel / Blade integration

Copy the Blade and controller snippets into your application, then wire `AzureBlobSasIssuer` to
your server-side Azure identity or SDK. The issuer must authorize the current user and create a
short-lived SAS for one generated blob key. Configure CORS for the precise frontend origin.

The Blade snippet expects Vite to serve the copied ModularCore source. It only sends file metadata
and a CSRF token to Laravel; Azure account keys and connection strings remain server-side.
