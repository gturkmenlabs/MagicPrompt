/**
 * Store modulu — multi-tenant ready soyutlama.
 * @see docs/MULTI_TENANCY_AND_KEYS.md
 */

export { getPromptStore, type IPromptStore, type StoredPrompt, type ListOptions, type SavePromptPayload } from './promptStore';
export { listPrompts, getPrompt, savePrompt, deletePrompt } from './prompts';
