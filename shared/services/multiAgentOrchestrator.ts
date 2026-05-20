/**
 * Multi-Agent Orchestrator
 *
 * User istegini analysis eder, uygun agent'lara yonlendirir,
 * agent'lar arasi iletisimi koordine eder.
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import type {
  AgentType,
  AgentMessage,
  AgentMemory,
  OrchestratorDecision,
  AgentStatus,
  StreamingStep,
} from '../types/agent';

// ---------- Agent Registry ----------

const agentRegistry: Record<AgentType, AgentStatus> = {
  devops: {
    type: 'devops',
    status: 'idle',
    toolsAvailable: ['health_check', 'deploy', 'restart_service', 'view_logs', 'vps_exec', 'db_query'],
    messagesProcessed: 0,
  },
  prompt: {
    type: 'prompt',
    status: 'idle',
    toolsAvailable: ['search_prompts', 'get_prompt', 'enrich_prompt', 'compare_prompts', 'batch_enrich', 'export_prompt_pack'],
    messagesProcessed: 0,
  },
  analytics: {
    type: 'analytics',
    status: 'idle',
    toolsAvailable: ['analyze_performance', 'get_trends', 'cost_analysis', 'drift_detection'],
    messagesProcessed: 0,
  },
  orchestrator: {
    type: 'orchestrator',
    status: 'idle',
    toolsAvailable: ['route_query', 'delegate_task', 'aggregate_results'],
    messagesProcessed: 0,
  },
};

// ---------- Message Bus (A2A Communication) ----------

const messageBus: AgentMessage[] = [];
const messageHandlers: Map<string, (msg: AgentMessage) => Promise<void>> = new Map();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function sendMessage(
  from: AgentType,
  to: AgentType | 'broadcast',
  type: AgentMessage['type'],
  payload: Record<string, unknown>,
  correlationId?: string
): AgentMessage {
  const msg: AgentMessage = {
    id: generateId(),
    from,
    to,
    type,
    payload,
    timestamp: new Date().toISOString(),
    correlationId,
  };
  messageBus.push(msg);

  // Notify handlers
  if (to !== 'broadcast') {
    const handler = messageHandlers.get(to);
    if (handler) handler(msg);
  } else {
    // Broadcast to all
    messageHandlers.forEach((handler) => handler(msg));
  }

  return msg;
}

export function registerMessageHandler(agentType: AgentType, handler: (msg: AgentMessage) => Promise<void>) {
  messageHandlers.set(agentType, handler);
}

export function getMessageHistory(agentType?: AgentType): AgentMessage[] {
  if (!agentType) return [...messageBus];
  return messageBus.filter(m => m.to === agentType || m.to === 'broadcast' || m.from === agentType);
}

// ---------- Agent Memory ----------

const memoryStore = new Map<string, AgentMemory>();

export function getAgentMemory(userId: string): AgentMemory {
  let memory = memoryStore.get(userId);
  if (!memory) {
    memory = {
      id: generateId(),
      userId,
      preferredFrameworks: [],
      commonDomains: [],
      enrichmentMode: 'fast',
      pastSuccessfulPrompts: [],
      userPreferences: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.set(userId, memory);
  }
  return memory;
}

export function updateAgentMemory(userId: string, updates: Partial<AgentMemory>): AgentMemory {
  const memory = getAgentMemory(userId);
  Object.assign(memory, updates, { updatedAt: new Date().toISOString() });
  memoryStore.set(userId, memory);
  return memory;
}

export function recordSuccessfulPrompt(
  userId: string,
  promptId: string,
  promptName: string,
  successRate: number,
  domainId?: string,
  framework?: string
) {
  const memory = getAgentMemory(userId);
  const existing = memory.pastSuccessfulPrompts.find(p => p.promptId === promptId);

  if (existing) {
    existing.successRate = (existing.successRate + successRate) / 2;
    existing.usedAt = new Date().toISOString();
  } else {
    memory.pastSuccessfulPrompts.push({
      promptId,
      promptName,
      successRate,
      usedAt: new Date().toISOString(),
      domainId,
      framework,
    });
  }

  // Update preferences
  if (domainId && !memory.commonDomains.includes(domainId)) {
    memory.commonDomains.push(domainId);
  }
  if (framework && !memory.preferredFrameworks.includes(framework)) {
    memory.preferredFrameworks.push(framework);
  }

  memory.updatedAt = new Date().toISOString();
  memoryStore.set(userId, memory);
}

// ---------- Orchestrator Tools ----------

const routeQueryTool = tool({
  name: 'route_query',
  description: 'Analyze user query and determine which agents should handle it. Returns routing decision with reasoning.',
  parameters: z.object({
    query: z.string().describe('User query to analyze'),
  }),
  execute: async (input) => {
    const query = input.query.toLowerCase();
    const routedTo: AgentType[] = [];
    const reasons: string[] = [];

    // DevOps keywords
    const devopsKeywords = ['deploy', 'health', 'log', 'restart', 'service', 'vps', 'server', 'database', 'db', 'build', 'test'];
    if (devopsKeywords.some(k => query.includes(k))) {
      routedTo.push('devops');
      reasons.push('DevOps-related keywords detected');
    }

    // Prompt keywords
    const promptKeywords = ['prompt', 'enrich', 'search', 'find prompt', 'compare', 'recommend', 'generate', 'master prompt'];
    if (promptKeywords.some(k => query.includes(k))) {
      routedTo.push('prompt');
      reasons.push('Prompt-related keywords detected');
    }

    // Analytics keywords
    const analyticsKeywords = ['analytics', 'stats', 'trend', 'performance', 'cost', 'usage', 'metric', 'report', 'analysis'];
    if (analyticsKeywords.some(k => query.includes(k))) {
      routedTo.push('analytics');
      reasons.push('Analytics-related keywords detected');
    }

    // Default to prompt agent if no match
    if (routedTo.length === 0) {
      routedTo.push('prompt');
      reasons.push('Default routing to prompt agent');
    }

    const decision: OrchestratorDecision = {
      query: input.query,
      intent: query.includes('enrich') ? 'enrichment' : query.includes('search') ? 'search' : 'general',
      routedTo,
      reasoning: reasons.join('; '),
      confidence: routedTo.length === 1 ? 0.9 : 0.75,
    };

    return JSON.stringify(decision);
  },
});

const delegateTaskTool = tool({
  name: 'delegate_task',
  description: 'Delegate a specific task to an agent. Creates a message in the bus and returns task ID.',
  parameters: z.object({
    targetAgent: z.enum(['devops', 'prompt', 'analytics']).describe('Agent to delegate to'),
    taskType: z.string().describe('Type of task (e.g., "health_check", "enrich_prompt")'),
    payload: z.string().describe('Task parameters as JSON string (e.g. "{\\"id\\":\\"123\\"}")'),
    userId: z.string().describe('User ID for context'),
  }),
  execute: async (input) => {
    const payload = typeof input.payload === 'string' ? JSON.parse(input.payload) : input.payload;
    const msg = sendMessage(
      'orchestrator',
      input.targetAgent,
      'request',
      {
        taskType: input.taskType,
        ...payload,
      }
    );

    // Update agent status
    agentRegistry[input.targetAgent].status = 'busy';
    agentRegistry[input.targetAgent].currentTask = input.taskType;
    agentRegistry[input.targetAgent].messagesProcessed++;

    return JSON.stringify({
      taskId: msg.id,
      delegatedTo: input.targetAgent,
      status: 'delegated',
      timestamp: msg.timestamp,
    });
  },
});

const aggregateResultsTool = tool({
  name: 'aggregate_results',
  description: 'Aggregate results from multiple agents into a unified response.',
  parameters: z.object({
    correlationId: z.string().describe('Correlation ID to match related messages'),
  }),
  execute: async (input) => {
    const relatedMessages = messageBus.filter(m => m.correlationId === input.correlationId);

    const results = relatedMessages
      .filter(m => m.type === 'response')
      .map(m => ({
        from: m.from,
        payload: m.payload,
        timestamp: m.timestamp,
      }));

    return JSON.stringify({
      correlationId: input.correlationId,
      totalMessages: relatedMessages.length,
      results,
      aggregated: results.length > 0,
    });
  },
});

/** Prompt kutuphanesi agent'ini gercekten calistirir; arama, oneri, zenginlestirme. */
const invokePromptAgentTool = tool({
  name: 'invoke_prompt_agent',
  description: 'Run the Prompt Library agent: semantic search, recommend prompts, enrich prompt, parse/transform. Use this whenever the user asks about prompts, search, recommend, enrich, improve, or analyze prompts.',
  parameters: z.object({
    query: z.string().describe('User question or task'),
    currentPrompt: z.string().default('').describe('Current prompt text if user wants to enrich/improve it'),
    domainId: z.string().default('').describe('Domain context if known'),
    framework: z.string().default('').describe('Framework context if known'),
  }),
  execute: async (input) => {
    const { runPromptAgent } = await import('./agentService');
    const cp = input.currentPrompt || '';
    const di = input.domainId || '';
    const fw = input.framework || '';
    const context = (cp || di || fw)
      ? {
          currentPrompt: cp || undefined,
          domainId: di || undefined,
          framework: fw || undefined,
        }
      : undefined;
    const result = await runPromptAgent(input.query, context);
    return JSON.stringify({
      answer: result.answer,
      enrichedPrompt: result.enrichedPrompt,
      model: result.model,
    });
  },
});

// ---------- Orchestrator Agent ----------

function createOrchestratorAgent(): InstanceType<typeof Agent> {
  return new Agent({
    name: 'OrchestratorAgent',
    instructions: `You are the orchestrator agent for Super Reasoning. Your job is to:
1. Analyze user queries and route them to the right capability
2. For prompt-related requests (search, recommend, enrich, improve, parse, analyze prompts): ALWAYS use invoke_prompt_agent with the user's query and optional context. Return its answer directly to the user.
3. For analytics/devops you may use route_query and delegate_task; for prompt questions always use invoke_prompt_agent first.

When the user asks to find prompts, recommend prompts, enrich a prompt, or anything about the prompt library — call invoke_prompt_agent immediately with their query and language. Present the agent's answer clearly.

Be concise and actionable.`,
    model: 'gpt-4o-mini',
    tools: [routeQueryTool, delegateTaskTool, aggregateResultsTool, invokePromptAgentTool],
  });
}

// ---------- Streaming Support ----------

export interface StreamingContext {
  steps: StreamingStep[];
  currentStep: number;
  onProgress?: (step: StreamingStep) => void;
  onComplete?: (steps: StreamingStep[]) => void;
}

export function createStreamingContext(
  stepLabels: string[],
  onProgress?: (step: StreamingStep) => void,
  onComplete?: (steps: StreamingStep[]) => void
): StreamingContext {
  const steps: StreamingStep[] = stepLabels.map((label, idx) => ({
    step: idx + 1,
    total: stepLabels.length,
    status: 'pending' as const,
    label,
  }));

  return {
    steps,
    currentStep: 0,
    onProgress,
    onComplete,
  };
}

export function updateStreamingStep(
  ctx: StreamingContext,
  stepIndex: number,
  status: StreamingStep['status'],
  detail?: string,
  progress?: number
): void {
  if (stepIndex >= 0 && stepIndex < ctx.steps.length) {
    const step = ctx.steps[stepIndex];
    if (step) {
      step.status = status;
      if (detail) step.detail = detail;
      if (progress !== undefined) step.progress = progress;
      ctx.currentStep = stepIndex;
      ctx.onProgress?.(step);

      if (status === 'completed' && stepIndex === ctx.steps.length - 1) {
        ctx.onComplete?.(ctx.steps);
      }
    }
  }
}

// ---------- Public API ----------

export async function runOrchestrator(
  query: string,
  userId: string,
  context?: Record<string, unknown>
): Promise<{ answer: string; decision: OrchestratorDecision; memory: AgentMemory }> {
  const agent = createOrchestratorAgent();
  const memory = getAgentMemory(userId);

  // Inject memory into context
  const enrichedContext = {
    ...context,
    userMemory: {
      preferredFrameworks: memory.preferredFrameworks,
      commonDomains: memory.commonDomains,
      enrichmentMode: memory.enrichmentMode,
    },
  };

  const result = await run(agent, query, { context: enrichedContext });

  // Parse routing decision
  const decision: OrchestratorDecision = {
    query,
    intent: 'general',
    routedTo: ['prompt'],
    reasoning: 'Default routing',
    confidence: 0.5,
  };

  // Extract decision from tool calls if available
  const output = typeof result.finalOutput === 'string' ? result.finalOutput : '';

  return {
    answer: output,
    decision,
    memory,
  };
}

export function getAgentStatuses(): Record<AgentType, AgentStatus> {
  return { ...agentRegistry };
}

export function resetAgentStatus(agentType: AgentType): void {
  if (agentRegistry[agentType]) {
    agentRegistry[agentType].status = 'idle';
    agentRegistry[agentType].currentTask = undefined;
  }
}

export { agentRegistry };
