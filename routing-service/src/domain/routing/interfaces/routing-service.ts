import type { RoutePromptInput, RoutePromptOutput } from '@/types/routing.js';

export interface RoutingService {
  routePrompt(input: RoutePromptInput): Promise<RoutePromptOutput>;
}
