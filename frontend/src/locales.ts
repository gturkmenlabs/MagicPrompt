// Locale aggregator — combines per-language tables into a single map.
import { en } from './locales/en';
import { tr } from './locales/tr';

export const translations = { en, tr } as const;
export { en, tr };
