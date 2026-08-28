<script lang="ts">
  // Decorative, fixed behind all content. A faint line grid that fades toward the edges, plus one
  // soft brand glow at the top that gently breathes. Reads the theme-aware --ui-* tokens so it
  // re-tints itself for light/dark automatically.
</script>

<div class="bg" aria-hidden="true">
  <div class="grid"></div>
  <div class="glow"></div>
</div>

<style>
  .bg {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  }

  /* Faint square line grid, masked to a soft vignette so it never competes with content. */
  .grid {
    position: absolute;
    inset: -1px;
    background-image:
      linear-gradient(to right, var(--ui-grid-line) 1px, transparent 1px),
      linear-gradient(to bottom, var(--ui-grid-line) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 80%);
    -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 80%);
  }

  /* Single soft brand glow anchored top-center. */
  .glow {
    position: absolute;
    top: -22%;
    left: 50%;
    width: 80vw;
    height: 55vh;
    transform: translateX(-50%);
    background: radial-gradient(ellipse at center, var(--ui-aurora-2), transparent 68%);
    filter: blur(70px);
    opacity: 0.6;
    animation: breathe 14s ease-in-out infinite alternate;
  }

  @keyframes breathe {
    from {
      opacity: 0.45;
      transform: translateX(-50%) scale(1);
    }
    to {
      opacity: 0.75;
      transform: translateX(-50%) scale(1.08);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .glow {
      animation: none;
    }
  }
</style>
