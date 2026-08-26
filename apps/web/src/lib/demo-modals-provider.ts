import { createInMemoryProvider } from '@modularcore/modals/providers/in-memory';

import type { ModalConfig } from '@modularcore/modals/types';
import type { ModalsProvider } from '@modularcore/modals/provider';

/**
 * DEMO-ONLY `ModalsProvider` for the public Modals playground: a static, in-memory fixture list
 * covering every overlay type. All triggers are `manual` so the playground can fire each one on
 * demand via buttons instead of waiting on delay/scroll/exit-intent timing. No network call, no
 * credentials of any kind — see `core/provider.ts` for why a real backend must be swapped in
 * behind this same interface (Prisma, a CMS, etc.), never bundled into this package.
 */
export function createDemoModalsProvider(
  onView: (evt: Parameters<NonNullable<ModalsProvider['trackView']>>[0]) => void,
  onInteraction: (evt: Parameters<NonNullable<ModalsProvider['trackInteraction']>>[0]) => void,
): ModalsProvider {
  const modals: ModalConfig[] = [
    {
      id: 'demo-modal',
      type: 'modal',
      title: 'Modal centrado',
      message: 'Este es el overlay `modal`: centrado, con focus trap y cierre con Escape.',
      trigger: { type: 'manual' },
      primaryButton: { text: 'Entendido' },
      maxWidth: 'md',
    },
    {
      id: 'demo-fullscreen',
      type: 'fullscreen',
      title: 'Fullscreen',
      message: 'Este es el overlay `fullscreen`: ocupa todo el viewport.',
      trigger: { type: 'manual' },
      primaryButton: { text: 'Cerrar' },
    },
    {
      id: 'demo-top-banner',
      type: 'top-banner',
      message: 'Este es el `top-banner`: fijo arriba, no roba foco (aria-live).',
      trigger: { type: 'manual' },
    },
    {
      id: 'demo-bottom-banner',
      type: 'bottom-banner',
      message: 'Este es el `bottom-banner`: fijo abajo, mismo comportamiento que el de arriba.',
      trigger: { type: 'manual' },
      secondaryButton: { text: 'Más info', url: 'https://example.com' },
    },
    {
      id: 'demo-slide-in',
      type: 'slide-in',
      title: 'Slide-in',
      message: 'Este es el `slide-in`: panel de esquina en desktop, casi ancho completo en móvil.',
      trigger: { type: 'manual' },
    },
    {
      id: 'demo-toast',
      type: 'toast',
      message: 'Este es un `toast`: transitorio, se auto-cierra y admite varios simultáneos (stack).',
      trigger: { type: 'manual' },
      autoDismissMs: 4000,
    },
  ];

  return createInMemoryProvider({ modals, onView, onInteraction });
}
