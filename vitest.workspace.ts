import { defineWorkspace } from 'vitest/config';

// Vitest workspace mode: descubre configs de packages/* y apps/* a medida
// que se crean en las fases siguientes. Vacío en Fase 1 (sin paquetes aún).
export default defineWorkspace(['packages/*', 'apps/*']);
