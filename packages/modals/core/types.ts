// Framework-agnostic data model for @modularcore/modals. No DOM, no framework imports.

export type OverlayType =
  'modal' | 'fullscreen' | 'top-banner' | 'bottom-banner' | 'slide-in' | 'toast';

export type TriggerType = 'page-load' | 'delay' | 'scroll' | 'exit-intent' | 'click' | 'manual';
// 'page-load' is an alias of 'delay' with value≈0 — handled as a single branch in scheduleTrigger (core/triggers.ts).

export type FrequencyType = 'always' | 'once-per-session' | 'once-per-day' | 'once-ever';

export type InteractionAction =
  'primary-button' | 'secondary-button' | 'close-button' | 'outside-click';

/** Slots of single instance (1 overlay per slot). 'toast' is not here: it is multi-instance. */
export type SingletonSlot = 'modal' | 'top-banner' | 'bottom-banner' | 'slide-in';
// 'fullscreen' shares the 'modal' slot.

export interface OverlayButton {
  text: string;
  /** Rendered as href; the core applies a scheme allowlist before use. */
  url?: string;
}

export interface ModalConfig {
  /** Required: key used for frequency capping and tracking. */
  id: string;
  name?: string;
  type: OverlayType;
  title?: string;
  /** Rendered as text by default (textContent), never raw HTML. */
  message: string;
  /** Opt-in: when true, `message` is rendered via a markdown sanitizer, never via raw innerHTML. */
  allowHtml?: boolean;
  /** Rendered as <img src>; the core validates the scheme (https/data) before use. */
  imageUrl?: string;
  primaryButton?: OverlayButton;
  secondaryButton?: OverlayButton;
  /** Default: true. */
  showCloseButton?: boolean;
  /** value: ms for 'delay', percent (0-100) for 'scroll'. */
  trigger: { type: TriggerType; value?: number };
  /** Default: 'always'. */
  frequency?: FrequencyType;
  /** Default: 0. Higher wins the slot; irrelevant for 'toast'. */
  priority?: number;
  /** ISO 8601. */
  startDate?: string;
  /** ISO 8601. */
  endDate?: string;
  /** Default: true. */
  isActive?: boolean;
  targeting?: { pages?: string[]; excludePages?: string[] };
  // Presentation (headless-minimal): values validated before being applied as styles.
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Validated against a hex/rgb(a) pattern before being applied. */
  bgColor?: string;
  /** Validated against a hex/rgb(a) pattern before being applied. */
  textColor?: string;
  /** Only used by 'toast'. */
  autoDismissMs?: number;
}

/** Context passed to a provider/eligibility pass. The clock lives in the manager's deps, not here. */
export interface ModalsContext {
  /** Current pathname, used for targeting. */
  path: string;
}

export interface ViewEvent {
  modalId: string;
  /** Pathname without query string. */
  path: string;
  at: string;
}

export interface InteractionEvent {
  modalId: string;
  action: InteractionAction;
  /** Pathname without query string. */
  path: string;
  at: string;
}
