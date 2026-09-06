# Paridad entre frameworks

**Objetivo del repositorio**: lo que un componente ofrece en un framework debe ofrecerlo en todos
los que declara. Quien instala en Angular espera lo mismo que quien instala en React.

**No es una barrera de entrada.** Un colaborador aporta los frameworks que domina y lo dice en el
PR; completar el resto es trabajo del mantenimiento. Lo que no se admite es una brecha *sin
declarar*, porque entonces la descubre el consumidor al instalar.

## Fase 1 — andamiaje (hecha)

- `ui` en el descriptor: cobertura de la UI de referencia por framework, separada de `frameworks`,
  que sigue gobernando dónde se puede instalar.
- `packages/registry/src/ui-coverage.ts` + su prueba: compara lo declarado con lo que hay y falla
  en los dos sentidos — brecha nueva sin declarar, y brecha declarada que ya se cubrió.
- `CONTRIBUTING.md`, plantilla de PR y `apps/docs`: el contrato, escrito donde el colaborador lo va
  a leer.
- Catálogo de la web: distingue un framework con UI de uno que sólo trae núcleo y adaptador.

## Inventario de deuda

Estado al cerrar la Fase 1. Cada línea es trabajo del mantenimiento, ya declarado en su descriptor.

### media-picker

| Framework | Instalable | UI | Falta |
|---|:---:|---|---|
| react | ✅ | 4 presentaciones | `MediaLibraryModal` |
| svelte | ✅ | 4 presentaciones | — |
| vue | ✅ | ninguna | 8 componentes × 4 presentaciones |
| angular | ✅ | ninguna | 8 componentes × 4 presentaciones |
| blade | ✅ | snippets | — |
| vanilla | ✅ | snippets | — |

### modals

| Framework | Instalable | UI | Falta |
|---|:---:|---|---|
| react | ✅ | sólo headless | `tailwind`, `shadcn`, `vanilla` (7 componentes × 3) |
| svelte | ✅ | 4 presentaciones | — |

Declara sólo react y svelte. Añadir vue/angular exige antes sus adaptadores.

### ai-chat

| Framework | Instalable | UI | Falta |
|---|:---:|---|---|
| react, svelte, vue, angular | ✅ | ninguna | UI de referencia entera |
| blade, vanilla | ✅ | snippets | — |

Cinco adaptadores y ni un componente de interfaz: es el desfase mayor del catálogo.

## Fases siguientes, por orden de menor a mayor coste

1. **`MediaLibraryModal` en React** (4 ficheros). La brecha más pequeña y ya declarada.
2. **Las tres presentaciones de `modals` en React** (21 ficheros). Mecánico: las de Svelte sirven
   de referencia literal.
3. **UI de `ai-chat`**, empezando por react y svelte. Decidir antes qué componentes la forman.
4. **UI de Vue y Angular**, que es donde aparecen las preguntas de fondo:
   - La presentación `shadcn` se apoya en `bits-ui` (Svelte) y `@radix-ui/*` (React). Para Vue y
     Angular hay que elegir equivalente, o decidir que esa presentación no aplica y declararlo.
   - `collectNpmDependencies` no recorta dependencias por framework aunque los ficheros sí se
     recortan: hoy un proyecto React instala `bits-ui`. Conviene resolverlo antes de multiplicar
     las dependencias de UI por dos frameworks más.

## Decisiones tomadas

- **`frameworks` y `ui` son ejes distintos.** Bajar `frameworks` para que cuadre con la UI habría
  roto la instalación en proyectos Vue, donde el adaptador funciona hoy.
- **Las brechas se declaran con nombre**, no con un porcentaje ni un estado difuso: `missing`
  lista componentes concretos, y la prueba exige que la lista sea exacta.
- **`blade` y `vanilla` no tienen UI de referencia** y no se les pide: se sirven con snippets.
