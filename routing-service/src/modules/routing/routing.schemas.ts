import { z } from 'zod';
import { FRAMEWORKS } from '../../domain/routing/types/framework.js';

export const routeRequestSchema = z.object({
  prompt: z.string().min(3),
  conversationContext: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1),
      })
    )
    .default([]),
  attachments: z
    .array(
      z.object({
        name: z.string().optional(),
        mimeType: z.string().optional(),
        textHint: z.string().optional(),
      })
    )
    .default([]),
  metadata: z
    .object({
      userId: z.string().optional(),
      locale: z.string().optional(),
      channel: z.string().optional(),
    })
    .catchall(z.unknown())
    .default({}),
});

export const routeResponseSchema = z.object({
  selectedFramework: z.enum(FRAMEWORKS),
  confidence: z.number().min(0).max(1),
  reasoning: z.array(z.string()),
  fallbackFramework: z.enum(FRAMEWORKS),
  candidateFrameworks: z.array(
    z.object({
      name: z.enum(FRAMEWORKS),
      score: z.number().min(0).max(1),
    })
  ),
});

export type RouteRequestDto = z.infer<typeof routeRequestSchema>;
export type RouteResponseDto = z.infer<typeof routeResponseSchema>;
