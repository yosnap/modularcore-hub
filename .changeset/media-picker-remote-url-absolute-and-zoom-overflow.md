---
"@modularcore/media-picker": patch
---

Fix two real bugs found while manually testing `RemoteUrlLoader` in a browser: `resolveUrl`
must return an absolute URL (`fromRemoteUrl` does `new URL(url)` with no base, so a relative
proxy path throws `TypeError: Invalid URL`) — documented and fixed in the playground wiring.
And `ImageEditor`'s zoom preview now wraps the `<img>` in an `overflow: hidden` container so a
`transform: scale()` preview doesn't visually spill past its box onto surrounding content
(transforms don't reserve layout space).
