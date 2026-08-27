---
phase: 1
title: "Contrato y descriptores de compatibilidad"
status: completed
priority: P1
effort: "2-3d"
dependencies: []
---

# Phase 1: Contrato y descriptores de compatibilidad

## Overview

Prepara exports, peers, manifiestos y contrato Azure. Es la única fase que altera superficies
compartidas; los cores no cambian su semántica.

## Requirements

- Inventariar el bridge existente (`subscribe`, snapshot, dispose) y extraer tipos solo si DRY.
- Añadir entrypoints/peer deps opcionales para Vue/Angular sin cargar React/Svelte en consumidores.
- Diseñar `AzureBlobTarget`: URL SAS, key y headers permitidos; prohibir account key, connection
  string y SAS de cuenta en config browser.
- Declarar archivos/targets seguros en `modularcore.json`; fixture prueba compatibilidad CLI.

## Related Code Files

- Modify: `packages/{media-picker,ai-chat}/{package.json,modularcore.json}`
- Create: `packages/media-picker/core/providers/azure-blob.ts`
- Create: `packages/media-picker/test/providers/azure-blob.test.ts`
- Modify: `packages/cli/test/fixtures/registry/*`, `packages/registry/test/build-registry.test.ts`

## Implementation Steps

1. Comparar adapters React/Svelte y fijar tipos bridge mínimos.
2. Declarar exports `./vue`, `./angular`, `./providers/azure-blob` y peer ranges.
3. Modelar el destino Azure y validar URL/key/headers sin revelar query SAS en errores.
4. Actualizar descriptors, archivos de copy-code y fixtures de registry.
5. Añadir pruebas contractuales base de abort/progreso/error reutilizables por fases 2–4.

## Success Criteria

- [x] Cores no importan Vue, Angular ni SDK Azure.
- [x] `build:registry` valida manifests/targets/peers.
- [x] La API browser no admite secretos Azure.

## Risk Assessment

Una API temporal puede hacerse pública. Se expone solo lo que ya representa operaciones existentes
y se cubre con pruebas de contrato.
