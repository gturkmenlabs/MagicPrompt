import { describe, it, expect } from 'vitest';

describe('judgePromptProgressive', () => {
  it('export edilmiş ve JudgeResult döndürmeli', async () => {
    const { judgePromptProgressive } = await import('./judgeEnsemble');
    expect(typeof judgePromptProgressive).toBe('function');

    const result = await judgePromptProgressive(
      'You are an expert assistant. Help the user complete their task. Respond in structured Markdown format with clear sections for role, instructions, and output format.',
      { domainId: 'general', riskLevel: 'low' }
    );

    expect(result).toHaveProperty('totalScore');
    expect(result).toHaveProperty('passThreshold');
    expect(typeof result.totalScore).toBe('number');
    expect(typeof result.passThreshold).toBe('boolean');
  });

  it('high risk domain — autoRevise true ile çalışmalı', async () => {
    const { judgePromptProgressive } = await import('./judgeEnsemble');

    const result = await judgePromptProgressive(
      'You are a medical compliance assistant. Always verify regulatory requirements before responding.',
      { domainId: 'medical', riskLevel: 'high' }
    );

    expect(result).toHaveProperty('totalScore');
    expect(result.iterationCount).toBeGreaterThanOrEqual(1);
  });
});
