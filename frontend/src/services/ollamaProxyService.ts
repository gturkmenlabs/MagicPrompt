export const triggerOllamaGeneration = async (_prompt: string) => {
  return 'Ollama proxy stub response';
};

export async function generateWithOllamaProxy(options: { systemPrompt: string; userPrompt: string; mode: 'local' | 'cloud'; temperature?: number; maxTokens?: number; language?: string }): Promise<{ response: string }> {
  const text = await triggerOllamaGeneration(options.userPrompt);
  return { response: text };
}
