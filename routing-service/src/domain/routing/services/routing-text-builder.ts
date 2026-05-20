import type { RoutePromptInput } from '@/types/routing.js';

export function buildRoutingText(input: RoutePromptInput): string {
  const contextSummary = input.conversationContext
    .slice(-6)
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join('\n');

  const attachmentHints = input.attachments
    .map((a) => `${a.mimeType ?? 'unknown'} ${a.name ?? ''} ${a.textHint ?? ''}`.trim())
    .filter(Boolean)
    .join(' | ');

  const metadataHints = Object.entries(input.metadata ?? {})
    .map(([k, v]) => `${k}:${String(v)}`)
    .join(', ');

  return [
    `Prompt: ${input.prompt}`,
    contextSummary ? `Conversation:\n${contextSummary}` : '',
    attachmentHints ? `Attachments: ${attachmentHints}` : '',
    metadataHints ? `Metadata: ${metadataHints}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
