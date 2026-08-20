---
"@modularcore/media-picker": minor
---

Add 3 downloadable style variants for every UI component (React + Svelte): Tailwind, Shadcn
(with real `@radix-ui/react-toggle`/`@radix-ui/react-slider` in React, `bits-ui` in Svelte), and
plain CSS ("vanilla", bundler-agnostic). New files live under `ui/{react,svelte}/{tailwind,shadcn,vanilla}/`
alongside the existing unstyled headless components, which are unchanged. `@radix-ui/react-toggle`,
`@radix-ui/react-slider`, and `bits-ui` are new optional peer dependencies — only required by
consumers who use the Shadcn variant.
