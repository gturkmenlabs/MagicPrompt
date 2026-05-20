import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassCard } from '../ui';

export type BattleVote = 'A' | 'B' | 'tie' | null;

export interface BlindBattleProps {
  promptA: string;
  promptB: string;
  onVote: (vote: BattleVote) => void;
  onBack?: () => void;
}

export function BlindBattle({ promptA, promptB, onVote, onBack }: BlindBattleProps) {
  const [vote, setVote] = useState<BattleVote>(null);

  const handleVote = (v: BattleVote) => {
    setVote(v);
    onVote(v);
  };

  return (
    <div className="min-h-screen p-6 sm:p-8 flex flex-col">
      <div className="flex items-center justify-between mb-6 sm:mb-12">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="neon-btn px-4 py-2 text-sm rounded-xl"
          >
            ← Lobi
          </button>
        )}
        <h2 className="neon-text text-3xl sm:text-4xl font-black text-center flex-1">
          Prompt A mi Prompt B mi?
        </h2>
        {onBack && <div className="w-20" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-7xl mx-auto w-full flex-1">
        <GlassCard neon="cyan" className="p-6 sm:p-8 min-h-[400px] sm:min-h-[500px] flex flex-col">
          <h3 className="text-2xl sm:text-3xl font-bold neon-text mb-4 sm:mb-6">Prompt A</h3>
          <pre className="whitespace-pre-wrap font-mono text-base sm:text-lg leading-relaxed text-gray-200 flex-1 overflow-auto">
            {promptA}
          </pre>
        </GlassCard>

        <GlassCard neon="purple" className="p-6 sm:p-8 min-h-[400px] sm:min-h-[500px] flex flex-col">
          <h3 className="text-2xl sm:text-3xl font-bold neon-text mb-4 sm:mb-6">Prompt B</h3>
          <pre className="whitespace-pre-wrap font-mono text-base sm:text-lg leading-relaxed text-gray-200 flex-1 overflow-auto">
            {promptB}
          </pre>
        </GlassCard>
      </div>

      <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-8 sm:mt-12">
        <button
          type="button"
          onClick={() => handleVote('A')}
          className={cn(
            'neon-btn px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-bold rounded-2xl transition-all',
            vote === 'A' && 'bg-neon-cyan/30 border-neon-cyan scale-105 shadow-[0_0_25px_rgba(0,247,255,0.5)]'
          )}
        >
          A Daha Iyi
        </button>

        <button
          type="button"
          onClick={() => handleVote('B')}
          className={cn(
            'neon-btn px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-bold rounded-2xl transition-all border-neon-purple',
            vote === 'B' && 'bg-neon-purple/30 border-neon-purple scale-105 shadow-[0_0_25px_rgba(168,85,247,0.5)]'
          )}
        >
          B Daha Iyi
        </button>

        <button
          type="button"
          onClick={() => handleVote('tie')}
          className={cn(
            'neon-btn px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-bold rounded-2xl transition-all border-gray-400',
            vote === 'tie' && 'bg-gray-600/50 border-gray-400 scale-105'
          )}
        >
          Berabere
        </button>
      </div>

      {vote && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-8 sm:mt-10 text-xl sm:text-2xl neon-text"
        >
          Oyunuz alindi! Sonraki maca geciliyor...
        </motion.div>
      )}
    </div>
  );
}
