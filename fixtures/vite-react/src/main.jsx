import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

// Injected by scripts/inject-spike.mjs from the hello-core registry entry; not present
// until the spike has run at least once.
import { helloModularCore } from './modularcore/hello-core/hello.ts';

const root = createRoot(document.getElementById('app'));
root.render(createElement('pre', null, helloModularCore('React fixture')));
