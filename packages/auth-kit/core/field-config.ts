/**
 * Declarative, opt-in configuration for every optional field the register/login forms can
 * render. Nothing here is enabled by default — a consumer who only sets `onLogin`/`onRegister`
 * gets a plain email+password form, matching the "just email and password" use case from the
 * original request without any extra config.
 */

export interface TextFieldConfig {
  enabled: boolean;
  required?: boolean;
  label?: string;
}

export interface LegalConsentLink {
  label: string;
  href: string;
}

export interface LegalConsentConfig {
  enabled: boolean;
  /** Defaults to required when enabled — a legal checkbox that can be skipped defeats its purpose. */
  required?: boolean;
  /** Text shown before the links, e.g. "Acepto los". */
  text: string;
  links?: LegalConsentLink[];
}

export interface ProfileTypeOption {
  value: string;
  label: string;
}

export interface ProfileTypeFieldConfig {
  enabled: boolean;
  label?: string;
  options: ProfileTypeOption[];
  defaultValue?: string;
}

export interface TurnstileFieldConfig {
  enabled: boolean;
  /** Cloudflare Turnstile site key. When unset, the widget renders nothing and the form treats the field as passed — same no-op-in-dev behavior as a hand-rolled Turnstile integration. */
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  mode?: 'managed' | 'non-interactive' | 'invisible';
}

export interface AuthKitFieldConfig {
  firstName?: TextFieldConfig;
  lastName?: TextFieldConfig;
  phone?: TextFieldConfig;
  legalConsent?: LegalConsentConfig;
  profileType?: ProfileTypeFieldConfig;
  turnstile?: TurnstileFieldConfig;
}

export interface ResolvedFieldConfig {
  firstName: Required<TextFieldConfig>;
  lastName: Required<TextFieldConfig>;
  phone: Required<TextFieldConfig>;
  legalConsent: Required<Omit<LegalConsentConfig, 'links'>> & { links: LegalConsentLink[] };
  profileType: Required<ProfileTypeFieldConfig>;
  turnstile: Required<Omit<TurnstileFieldConfig, 'siteKey'>> & { siteKey?: string };
}

/** Fills every optional field config with an explicit `enabled: false` default so UI code never has to guard against `undefined`. */
export function resolveFieldConfig(config: AuthKitFieldConfig = {}): ResolvedFieldConfig {
  return {
    firstName: {
      enabled: config.firstName?.enabled ?? false,
      required: config.firstName?.required ?? false,
      label: config.firstName?.label ?? 'Nombre',
    },
    lastName: {
      enabled: config.lastName?.enabled ?? false,
      required: config.lastName?.required ?? false,
      label: config.lastName?.label ?? 'Apellidos',
    },
    phone: {
      enabled: config.phone?.enabled ?? false,
      required: config.phone?.required ?? false,
      label: config.phone?.label ?? 'Teléfono',
    },
    legalConsent: {
      enabled: config.legalConsent?.enabled ?? false,
      required: config.legalConsent?.required ?? true,
      text: config.legalConsent?.text ?? 'Acepto los',
      links: config.legalConsent?.links ?? [],
    },
    profileType: {
      enabled: config.profileType?.enabled ?? false,
      label: config.profileType?.label ?? 'Tipo de cuenta',
      options: config.profileType?.options ?? [],
      defaultValue:
        config.profileType?.defaultValue ?? config.profileType?.options?.[0]?.value ?? '',
    },
    turnstile: {
      enabled: config.turnstile?.enabled ?? false,
      siteKey: config.turnstile?.siteKey,
      theme: config.turnstile?.theme ?? 'auto',
      mode: config.turnstile?.mode ?? 'managed',
    },
  };
}
