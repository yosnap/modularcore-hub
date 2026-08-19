---
"@modularcore/media-picker": minor
---

Add the `RemoteUrlLoader` reference UI component (React + Svelte) — a thin text-input binding
to the existing `loadFromUrl()` core action, which previously had no matching UI piece in the
component set. Accepts an optional `resolveUrl` prop so an app can route the fetch through a
same-origin server proxy instead of a direct browser fetch, which is required for most
third-party image hosts (CORS). Also extends the demo `StorageProvider` used by the website
playground with folder support so `FolderSelect` has something real to show.
