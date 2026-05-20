import { useState, useCallback } from 'react';
import { ArenaLobby } from './ArenaLobby';
import { BlindBattle } from './BlindBattle';
import { Leaderboard } from './Leaderboard';
import type { BattleVote } from './BlindBattle';

/** Example promptlar — gercek uygulamada API'den veya havuzdan gelir */
const SAMPLE_PROMPTS = [
  [
    `Sen bir AI asistanisin. User sana su soruyu sordu: "React'ta state nasil yonetilir?"
Yardimci ol, kisa ve net cevap ver. Example kod ekleyebilirsin.`,
    `Sen bir uzman frontend gelistiricisisin. User React'ta state yonetimi istiyor.
Adim adim, useState/useReducer ve en iyi pratikleri acikla. Kod ornekleri ver.`,
  ],
  [
    `User bir API'den veri cekmek istiyor. Fetch kullan, JSON don, error yakala.`,
    `API entegrasyonu for: async/await, try/catch, loading ve error state'leri tanimla.
TypeScript ile tip guvenligi sagla. Example: useEffect icinde fetch.`,
  ],
  [
    `Bir metni ozetle. Kisa tut, 3 cumle yeter.`,
    `Metin ozetleme talimati: Ana fikirleri cikar, 2–4 cumleyle ozetle.
Gereksiz detaylari atla, tonu koru.`,
  ],
];

function getRandomPair(): [string, string] {
  const pair = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
  return [pair[0], pair[1]];
}

export type ArenaView = 'lobby' | 'battle' | 'leaderboard';

export function ArenaPage() {
  const [view, setView] = useState<ArenaView>('lobby');
  const [[promptA, promptB], setPrompts] = useState<[string, string]>(() => getRandomPair());

  const onStartBattle = useCallback(() => {
    setPrompts(getRandomPair());
    setView('battle');
  }, []);

  const onVote = useCallback((_vote: BattleVote) => {
    // Sonraki mac: kisa gecikme sonrasi yeni prompt cifti
    setTimeout(() => {
      setPrompts(getRandomPair());
    }, 1500);
  }, []);

  const onBackToLobby = useCallback(() => {
    setView('lobby');
  }, []);

  if (view === 'lobby') {
    return (
      <>
        <ArenaLobby onStartBattle={onStartBattle} />
        <div className="fixed bottom-6 right-6 flex gap-2">
          <button
            type="button"
            onClick={() => setView('leaderboard')}
            className="neon-btn px-4 py-2 text-sm rounded-xl"
          >
            🏆 Siralama
          </button>
        </div>
      </>
    );
  }

  if (view === 'battle') {
    return (
      <>
        <BlindBattle
          promptA={promptA}
          promptB={promptB}
          onVote={onVote}
          onBack={onBackToLobby}
        />
        <div className="fixed bottom-6 right-6 flex gap-2">
          <button
            type="button"
            onClick={() => setView('leaderboard')}
            className="neon-btn px-4 py-2 text-sm rounded-xl"
          >
            🏆 Siralama
          </button>
        </div>
      </>
    );
  }

  return <Leaderboard onBack={onBackToLobby} />;
}
