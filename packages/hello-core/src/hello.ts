/** Trivial framework-agnostic export used to spike the copy-code injection pipeline. */
export function helloModularCore(name: string = 'world'): string {
  return `¡Hola, ${name}! (desde @modularcore/hello-core)`;
}
