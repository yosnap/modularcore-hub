# Azure Blob SAS endpoint (reference)

`createAzureBlobProvider` receives only a per-upload SAS URL from your backend. Never send an
account key, connection string, account-level SAS, or long-lived SAS to the browser.

Your endpoint must authenticate the request, authorize the target user, generate the blob key on
the server, validate MIME type and size, then return `{ url, key, headers? }`. Issue `c`/`w`
permissions only for that blob with a short expiration. Configure Blob CORS with your exact web
origin and required `PUT` headers; do not use `*` in production.

```ts
const provider = createAzureBlobProvider({
  containerUrl: 'https://account.blob.core.windows.net/media',
  async getUploadTarget(file, options) {
    const response = await fetch('/api/media/azure-upload-target', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: options?.contentType ?? file.type, size: file.size }),
    });
    if (!response.ok) throw new Error('Could not obtain an Azure upload target');
    return response.json();
  },
  getUrl: (key) => `https://cdn.example.com/${encodeURIComponent(key)}`,
});
```

For private media, `getUrl` should point to your authenticated media proxy. Do not return a SAS
query string from it because `StorageProvider.getUrl()` can be used by UI code and logs.
