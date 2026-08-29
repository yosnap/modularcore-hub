<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { afterNavigate } from '$app/navigation';

  import BackgroundPattern from '$lib/components/BackgroundPattern.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import CommandPalette, { type CommandItem } from '$lib/components/CommandPalette.svelte';
  import { focusInitialElement, restoreFocus, trapFocus } from '$lib/focus-management';
  import { PLAYGROUNDS } from '$lib/playgrounds';

  import type { LayoutData } from './$types';
  import '../app.css';

  let { children, data }: { children: Snippet; data: LayoutData } = $props();

  const sections = [
    { href: '/', label: 'Catálogo' },
    { href: '/cli', label: 'CLI' },
    { href: '/mcp-server', label: 'MCP Server' },
  ];

  let components = $derived(data.components ?? []);
  let path = $derived($page.url.pathname);

  function sectionActive(href: string): boolean {
    return href === '/' ? path === '/' : path.startsWith(href);
  }

  // The sidebar tree: folders (groups) each holding leaf links. `active` is derived from the
  // current path so the highlight follows navigation. Componentes is dropped when the registry
  // is empty.
  interface TreeLeaf {
    label: string;
    href: string;
    active: boolean;
  }
  interface TreeGroup {
    id: string;
    label: string;
    items: TreeLeaf[];
  }
  let groups = $derived(
    [
      {
        id: 'secciones',
        label: 'Secciones',
        items: sections.map((s) => ({ label: s.label, href: s.href, active: sectionActive(s.href) })),
      },
      {
        id: 'componentes',
        label: 'Componentes',
        items: components.map((c) => ({
          label: c.title,
          href: `/c/${c.name}`,
          active: path === `/c/${c.name}`,
        })),
      },
      {
        id: 'playgrounds',
        label: 'Playgrounds',
        items: PLAYGROUNDS.map((p) => ({ label: p.label, href: p.href, active: path === p.href })),
      },
    ].filter((group) => group.items.length) as TreeGroup[],
  );

  // Per-folder collapse state (all expanded by default). Persists for the session since the root
  // layout never remounts on client-side navigation.
  let collapsed = $state<Record<string, boolean>>({});
  function toggleGroup(id: string): void {
    collapsed[id] = !collapsed[id];
  }

  // Everything reachable, flattened for the command palette.
  let commandItems = $derived<CommandItem[]>([
    ...sections.map((s) => ({ label: s.label, href: s.href, group: 'Secciones' })),
    ...components.map((c) => ({
      label: c.title,
      href: `/c/${c.name}`,
      group: 'Componentes',
      hint: c.category,
    })),
    ...PLAYGROUNDS.map((p) => ({ label: p.label, href: p.href, group: 'Playgrounds' })),
  ]);

  let drawerOpen = $state(false);
  let paletteOpen = $state(false);
  let isMobile = $state(false);
  let drawerEl = $state<HTMLElement | null>(null);
  let drawerOpener = $state<HTMLElement | null>(null);

  function openDrawer(): void {
    drawerOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawerOpen = true;
    void tick().then(() => {
      if (drawerEl) focusInitialElement(drawerEl);
    });
  }

  function closeDrawer(): void {
    drawerOpen = false;
    void tick().then(() => restoreFocus(drawerOpener));
  }

  function toggleDrawer(): void {
    if (drawerOpen) closeDrawer();
    else openDrawer();
  }

  function onDrawerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
      return;
    }

    if (drawerEl) trapFocus(event, drawerEl);
  }

  // Progressive enhancement: drop a copy-to-clipboard button into every code block in the main
  // content. Runs client-side after mount and each navigation so newly rendered pages get it too.
  // Styles for `.code-copy` live in app.css (global) since these nodes are created at runtime and
  // fall outside Svelte's scoped styling.
  const COPY_ICON =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M5 15V5a2 2 0 0 1 2-2h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const CHECK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function enhanceCodeBlocks(): void {
    if (!browser) return;
    document.querySelectorAll<HTMLElement>('main pre:not([data-copy])').forEach((pre) => {
      pre.setAttribute('data-copy', '');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-copy';
      button.setAttribute('aria-label', 'Copiar código');
      button.innerHTML = COPY_ICON;
      button.addEventListener('click', async () => {
        const text = (pre.querySelector('code')?.textContent ?? pre.textContent ?? '').replace(
          /\n$/,
          '',
        );
        try {
          await navigator.clipboard.writeText(text);
          button.classList.add('copied');
          button.innerHTML = CHECK_ICON;
          setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = COPY_ICON;
          }, 1600);
        } catch {
          // Clipboard can be unavailable (insecure context / denied permission); ignore quietly.
        }
      });
      pre.appendChild(button);
    });
  }

  onMount(() => {
    const mobileQuery = window.matchMedia('(max-width: 900px)');
    const updateMobileState = (): void => {
      isMobile = mobileQuery.matches;
      if (!isMobile) drawerOpen = false;
    };

    updateMobileState();
    mobileQuery.addEventListener('change', updateMobileState);
    enhanceCodeBlocks();

    return () => mobileQuery.removeEventListener('change', updateMobileState);
  });
  afterNavigate(async () => {
    if (drawerOpen) closeDrawer();
    await tick();
    enhanceCodeBlocks();
  });
</script>

<BackgroundPattern />
<CommandPalette items={commandItems} bind:open={paletteOpen} />

<div class="shell">
  <header class="topbar">
    <div class="topbar-left">
      <button
        type="button"
        class="hamburger"
        aria-label="Abrir navegación"
        aria-expanded={drawerOpen}
        onclick={toggleDrawer}
      >
        <span></span><span></span><span></span>
      </button>
      <a class="brand" href="/" aria-label="ModularCore Hub — inicio">
        <svg class="brand-mark" viewBox="0 0 200 200" fill="none" aria-hidden="true">
          <path d="M100 20 L170 60 L100 100 L30 60 Z" fill="#8B5CF6" />
          <path d="M30 60 L100 100 L100 180 L30 140 Z" fill="#6366F1" />
          <path d="M170 60 L100 100 L100 180 L170 140 Z" fill="#4338CA" />
        </svg>
        <span class="brand-text">Modular<span class="brand-accent">Core</span></span>
      </a>
    </div>

    <div class="topbar-right">
      <button type="button" class="search-trigger" onclick={() => (paletteOpen = true)}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.7" />
          <path d="M20 20l-3.2-3.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        <span class="search-label">Buscar…</span>
        <kbd>⌘K</kbd>
      </button>
      <ThemeToggle />
    </div>
  </header>

  <div class="body">
    {#if isMobile && drawerOpen}
      <button
        type="button"
        class="backdrop"
        aria-label="Cerrar navegación"
        onclick={closeDrawer}
      ></button>
    {/if}

    <aside
      class="sidebar"
      class:open={drawerOpen}
      aria-label="Navegación principal"
      aria-hidden={isMobile && !drawerOpen ? 'true' : undefined}
      aria-modal={isMobile && drawerOpen ? 'true' : undefined}
      inert={isMobile && !drawerOpen}
      role={isMobile ? 'dialog' : undefined}
      tabindex="-1"
      bind:this={drawerEl}
      onkeydown={onDrawerKeydown}
    >
      <nav class="tree">
        {#each groups as group (group.id)}
          {@const open = !collapsed[group.id]}
          <div class="tree-group">
            <button
              type="button"
              class="tree-folder"
              onclick={() => toggleGroup(group.id)}
              aria-expanded={open}
            >
              <svg class="chevron" class:open viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>{group.label}</span>
            </button>

            {#if open}
              <ul class="tree-children">
                {#each group.items as item (item.href)}
                  <li>
                    <a
                      class="tree-leaf"
                      href={item.href}
                      class:active={item.active}
                      onclick={closeDrawer}
                    >
                      {item.label}
                    </a>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
      </nav>
    </aside>

    <div class="content">
      <main>
        {@render children()}
      </main>
    </div>
  </div>
</div>

<style>
  .shell {
    /* Pin the shell to the viewport: topbar on top, then a body row that fills the rest so only
       .content scrolls (position:fixed sidesteps vh/dvh rounding). */
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ---------- Brand ---------- */
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s var(--ui-ease-spring);
  }
  .brand:hover {
    transform: scale(1.02);
  }
  .brand:hover .brand-mark {
    /* Full spin on hover; on leaving, it eases smoothly back to its resting angle. */
    transform: rotate(360deg);
  }
  .brand-mark {
    width: 1.85rem;
    height: 1.85rem;
    filter: drop-shadow(0 4px 10px rgb(99 102 241 / 40%));
    transition: transform 0.7s var(--ui-ease-out);
  }
  .brand-text {
    font-family: var(--mc-font-display);
    font-weight: 700;
    font-size: 1.1rem;
    letter-spacing: -0.02em;
    color: hsl(var(--foreground));
  }
  .brand-accent {
    color: hsl(var(--primary));
  }

  /* ---------- Top navbar ---------- */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.6rem 1.25rem;
    background: var(--ui-glass-bg);
    backdrop-filter: blur(var(--ui-glass-blur)) saturate(140%);
    -webkit-backdrop-filter: blur(var(--ui-glass-blur)) saturate(140%);
    border-bottom: 1px solid var(--ui-glass-border);
    z-index: 40;
  }
  .topbar-left,
  .topbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .search-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.45rem 0.7rem;
    min-width: 15rem;
    border-radius: 999px;
    border: 1px solid var(--ui-glass-border);
    background: hsl(var(--muted) / 0.5);
    color: hsl(var(--muted-foreground));
    font-size: 0.85rem;
    cursor: pointer;
    transition:
      border-color 0.18s var(--ui-ease-out),
      background-color 0.18s var(--ui-ease-out);
  }
  .search-trigger:hover {
    border-color: hsl(var(--primary) / 0.45);
    background: hsl(var(--muted) / 0.8);
  }
  .search-trigger svg {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }
  .search-label {
    flex: 1;
    text-align: left;
  }
  .search-trigger kbd {
    font-family: var(--mc-font-mono);
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border: 1px solid var(--ui-glass-border);
    border-radius: 5px;
  }

  /* ---------- Body row ---------- */
  .body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
  }

  /* ---------- Sidebar ---------- */
  .sidebar {
    min-height: 0;
    height: 100%;
    overflow: hidden;
    padding: 1.1rem 0.9rem;
    background: var(--ui-glass-bg);
    backdrop-filter: blur(var(--ui-glass-blur)) saturate(140%);
    -webkit-backdrop-filter: blur(var(--ui-glass-blur)) saturate(140%);
    border-right: 1px solid var(--ui-glass-border);
  }
  /* ---------- Tree navigation ---------- */
  .tree {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.15rem;
  }
  .tree-group {
    display: flex;
    flex-direction: column;
  }
  .tree-folder {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.45rem 0.5rem;
    margin-top: 0.35rem;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: hsl(var(--muted-foreground));
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    cursor: pointer;
    transition: color 0.16s var(--ui-ease-out);
  }
  .tree-group:first-child .tree-folder {
    margin-top: 0;
  }
  .tree-folder:hover {
    color: hsl(var(--foreground));
  }
  .chevron {
    width: 0.85rem;
    height: 0.85rem;
    flex-shrink: 0;
    transform: rotate(-90deg);
    transition: transform 0.18s var(--ui-ease-out);
  }
  .chevron.open {
    transform: rotate(0deg);
  }

  /* Children indented under a vertical guide line, file-tree style. */
  .tree-children {
    list-style: none;
    margin: 0.1rem 0 0.15rem 1.05rem;
    padding-left: 0.7rem;
    border-left: 1px solid var(--ui-glass-border);
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }
  .tree-leaf {
    display: block;
    padding: 0.42rem 0.6rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    text-decoration: none;
    transition:
      color 0.16s var(--ui-ease-out),
      background-color 0.16s var(--ui-ease-out);
  }
  .tree-leaf:hover {
    color: hsl(var(--foreground));
    background: hsl(var(--primary) / 0.07);
  }
  .tree-leaf.active {
    color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.12);
  }

  /* ---------- Content ---------- */
  .content {
    min-width: 0;
    min-height: 0;
    height: 100%;
    overflow-y: auto;
  }
  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2.75rem 2rem 5rem;
  }

  /* ---------- Hamburger + drawer ---------- */
  .hamburger {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--ui-glass-border);
    background: var(--ui-glass-bg);
    cursor: pointer;
  }
  .hamburger span {
    display: block;
    height: 2px;
    border-radius: 2px;
    background: hsl(var(--foreground));
  }
  .backdrop {
    display: none;
  }

  @media (max-width: 900px) {
    .search-label,
    .search-trigger kbd {
      display: none;
    }
    .search-trigger {
      min-width: 0;
      padding: 0.5rem;
    }
    .hamburger {
      display: inline-flex;
    }
    .body {
      grid-template-columns: 1fr;
    }
    .backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 60;
      border: 0;
      background: rgb(2 2 8 / 55%);
      backdrop-filter: blur(2px);
      animation: fade-in 0.2s var(--ui-ease-out);
    }
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 70;
      width: 78vw;
      max-width: 300px;
      height: 100%;
      height: 100dvh;
      transform: translateX(-100%);
      visibility: hidden;
      pointer-events: none;
      transition: transform 0.3s var(--ui-ease-out);
    }
    .sidebar.open {
      transform: translateX(0);
      visibility: visible;
      pointer-events: auto;
      box-shadow: var(--ui-shadow-lg);
    }
    main {
      padding: 1.75rem 1.25rem 4rem;
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .brand,
    .brand-mark,
    .tree-folder,
    .chevron,
    .tree-leaf,
    .sidebar,
    .backdrop,
    .search-trigger {
      transition: none;
      animation: none;
    }
  }
</style>
