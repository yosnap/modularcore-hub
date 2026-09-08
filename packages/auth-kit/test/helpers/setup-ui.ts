import { cleanup as cleanupReact } from '@testing-library/react';
import { cleanup as cleanupSvelte } from '@testing-library/svelte';
import { cleanup as cleanupVue } from '@testing-library/vue';
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanupReact();
  cleanupSvelte();
  cleanupVue();
});
