declare module 'js-yaml' {
  function load(input: string): unknown;
  function loadAll(input: string): unknown[];
  function dump(obj: unknown): string;
}
