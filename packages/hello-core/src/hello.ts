/** Trivial framework-agnostic export used to spike the copy-code injection pipeline. */
export function helloModularCore(name: string = 'world'): string {
  return `Hello, ${name}! (from @modularcore/hello-core)`;
}
