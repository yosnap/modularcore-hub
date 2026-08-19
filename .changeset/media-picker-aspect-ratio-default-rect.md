---
"@modularcore/media-picker": patch
---

Fix `ImageEditor`'s crop rect defaulting to a hardcoded `{100,100}` regardless of the loaded
image's real size — selecting an aspect ratio preset and applying it against a large photo
silently produced a tiny sliver from the top-left corner, reading as "aspect ratio doesn't do
anything." The rect now resets to the full decoded image dimensions whenever a new blob loads
(React and Svelte), so the default crop is the whole image and the aspect ratio option
reshapes that.
