/**
 * Tailwind class names birlestirme — kosullu siniflar for.
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
