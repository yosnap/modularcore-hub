<script lang="ts">
  import { browser } from '$app/environment';

  // Seed from the class the pre-paint script in app.html already set, so the button matches the
  // rendered palette on first mount without a flash.
  let isDark = $state(browser && document.documentElement.classList.contains('dark'));

  function toggle(): void {
    isDark = !isDark;
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    try {
      localStorage.setItem('mc-theme', isDark ? 'dark' : 'light');
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for the session.
    }
  }
</script>

<button
  type="button"
  class="theme-toggle"
  onclick={toggle}
  aria-label={isDark ? 'Activar tema claro' : 'Activar tema oscuro'}
  aria-pressed={isDark}
  title={isDark ? 'Tema claro' : 'Tema oscuro'}
>
  <span class="icon" class:is-dark={isDark}>
    <!-- Sun -->
    <svg class="sun" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    </svg>
    <!-- Moon -->
    <svg class="moon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
    </svg>
  </span>
</button>

<style>
  .theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 999px;
    border: 1px solid var(--ui-glass-border);
    background: var(--ui-glass-bg);
    color: hsl(var(--foreground));
    cursor: pointer;
    transition:
      transform 0.2s var(--ui-ease-spring),
      border-color 0.2s var(--ui-ease-out),
      box-shadow 0.2s var(--ui-ease-out);
  }
  .theme-toggle:hover {
    transform: translateY(-1px);
    border-color: hsl(var(--primary) / 0.5);
    box-shadow: var(--ui-glow);
  }
  .theme-toggle:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  .icon {
    position: relative;
    width: 1.15rem;
    height: 1.15rem;
  }
  .icon svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transition:
      opacity 0.3s var(--ui-ease-out),
      transform 0.4s var(--ui-ease-spring);
  }
  .sun {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
  .moon {
    opacity: 0;
    transform: rotate(-90deg) scale(0.6);
  }
  .icon.is-dark .sun {
    opacity: 0;
    transform: rotate(90deg) scale(0.6);
  }
  .icon.is-dark .moon {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }

  @media (prefers-reduced-motion: reduce) {
    .theme-toggle,
    .icon svg {
      transition: none;
    }
  }
</style>
