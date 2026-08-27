# Wiring tracking to your own backend (reference)

`core/provider.ts`'s `ModalsProvider.trackView`/`trackInteraction` are hooks only — this package
ships no database, no API routes, and no persistence. This file is documentation only; it is not
part of the copy-code component and is not installed by the CLI.

Example schema (Prisma), mirroring the fields `getActiveModals()` needs plus the two event tables:

```prisma
// schema.prisma (YOUR backend, not part of @modularcore/modals)
model Modal {
  id        String   @id @default(cuid())
  type      String   // 'modal' | 'fullscreen' | 'top-banner' | 'bottom-banner' | 'slide-in' | 'toast'
  title     String?
  message   String
  allowHtml Boolean  @default(false)
  isActive  Boolean  @default(true)
  priority  Int      @default(0)
  startDate DateTime?
  endDate   DateTime?
  views       ModalView[]
  interactions ModalInteraction[]
}

model ModalView {
  id      String   @id @default(cuid())
  modalId String
  path    String
  at      DateTime
}

model ModalInteraction {
  id      String   @id @default(cuid())
  modalId String
  action  String
  path    String
  at      DateTime
}
```

Server endpoint (Node/Express-style; adapt to your framework):

```ts
// server/routes/modals.ts
export async function listActiveModals(req, res) {
  const modals = await prisma.modal.findMany({ where: { isActive: true } });
  res.json(modals); // shape matches ModalConfig[] — see core/types.ts
}

export async function recordView(req, res) {
  await prisma.modalView.create({ data: req.body }); // { modalId, path, at }
  res.status(204).end();
}

export async function recordInteraction(req, res) {
  await prisma.modalInteraction.create({ data: req.body }); // { modalId, action, path, at }
  res.status(204).end();
}
```

Client-side `ModalsProvider`:

```ts
import type { ModalsProvider } from '@modularcore/modals/provider';

export function createBackendProvider(): ModalsProvider {
  return {
    async getActiveModals() {
      const res = await fetch('/api/modals');
      return res.json(); // treated as UNTRUSTED content by ui/react and ui/svelte — see core/provider.ts
    },
    trackView(evt) {
      void fetch('/api/modals/views', { method: 'POST', body: JSON.stringify(evt) });
    },
    trackInteraction(evt) {
      void fetch('/api/modals/interactions', { method: 'POST', body: JSON.stringify(evt) });
    },
  };
}
```
