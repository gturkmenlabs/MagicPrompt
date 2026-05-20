import { describe, it, expect, vi } from 'vitest';

const makeMockChat = (scoreA: number, scoreB: number) =>
  vi.fn().mockResolvedValue(JSON.stringify({
    criteria: [
      { id: 'clarity', scoreA, scoreB, winner: scoreA > scoreB ? 'A' : 'B', reason: 'test' },
      { id: 'testability', scoreA, scoreB, winner: scoreA > scoreB ? 'A' : 'B', reason: 'test' },
      { id: 'constraint_compliance', scoreA, scoreB, winner: scoreA > scoreB ? 'A' : 'B', reason: 'test' },
      { id: 'security', scoreA, scoreB, winner: scoreA > scoreB ? 'A' : 'B', reason: 'test' },
      { id: 'reproducibility', scoreA, scoreB, winner: scoreA > scoreB ? 'A' : 'B', reason: 'test' },
    ],
  }));

describe('progressiveJudgePairwiseLLM', () => {
  it('low risk + yüksek skor → tek çağrı (positionSwap yok)', async () => {
    const { progressiveJudgePairwiseLLM } = await import('./pairwiseJudgeLLM');
    const mockChat = makeMockChat(80, 60);

    await progressiveJudgePairwiseLLM('prompt A', 'prompt B', mockChat, {
      riskLevel: 'low',
      scoreThresholdLow: 50,
    });

    expect(mockChat).toHaveBeenCalledTimes(1);
  });

  it('low risk + düşük skor → çift çağrı (positionSwap)', async () => {
    const { progressiveJudgePairwiseLLM } = await import('./pairwiseJudgeLLM');
    const mockChat = makeMockChat(40, 30);

    const result = await progressiveJudgePairwiseLLM('prompt A', 'prompt B', mockChat, {
      riskLevel: 'low',
      scoreThresholdLow: 50,
    });

    // positionSwap: true → judgePairwiseLLM 2 chat çağrısı yapıyor
    expect(mockChat).toHaveBeenCalledTimes(3); // 1 (first pass) + 2 (positionSwap retry)
    expect(result).toHaveProperty('winner');
    expect(result).toHaveProperty('totalA');
  });

  it('high risk → her zaman çift çağrı', async () => {
    const { progressiveJudgePairwiseLLM } = await import('./pairwiseJudgeLLM');
    const mockChat = makeMockChat(90, 70);

    await progressiveJudgePairwiseLLM('prompt A', 'prompt B', mockChat, {
      riskLevel: 'high',
    });

    expect(mockChat).toHaveBeenCalledTimes(2);
  });
});
