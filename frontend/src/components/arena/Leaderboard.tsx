import { motion } from 'framer-motion';
import { GlassCard } from '../ui';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  elo: number;
  streak: number;
}

export interface LeaderboardProps {
  entries?: LeaderboardEntry[];
  onBack?: () => void;
}

const DEFAULT_LEADERS: LeaderboardEntry[] = [
  { rank: 1, name: 'PromptMaster42', elo: 1850, streak: 12 },
  { rank: 2, name: 'NeonWizard', elo: 1780, streak: 7 },
  { rank: 3, name: 'CypherQueen', elo: 1720, streak: 5 },
  { rank: 4, name: 'PromptKnight', elo: 1690, streak: 3 },
  { rank: 5, name: 'AIWhisperer', elo: 1650, streak: 0 },
  { rank: 6, name: 'SyntaxSamurai', elo: 1610, streak: 2 },
  { rank: 7, name: 'LogicLaser', elo: 1580, streak: 0 },
  { rank: 8, name: 'TokenNinja', elo: 1550, streak: 4 },
  { rank: 9, name: 'ContextMage', elo: 1520, streak: 0 },
  { rank: 10, name: 'ClarityCoder', elo: 1490, streak: 1 },
];

export function Leaderboard({ entries = DEFAULT_LEADERS, onBack }: LeaderboardProps) {
  return (
    <div className="min-h-screen p-6 sm:p-8">
      <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
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
          GLOBAL LIDER TABLOSU
        </h2>
        {onBack && <div className="w-20" />}
      </div>

      <div className="glass-neon rounded-3xl p-6 sm:p-8 max-w-5xl mx-auto border border-neon-cyan/30">
        <div className="space-y-4">
          {entries.map((leader) => (
            <motion.div
              key={leader.rank}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: leader.rank * 0.05 }}
              className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 glass-neon rounded-2xl hover:scale-[1.02] transition-transform border border-white/5"
            >
              <div className="text-3xl sm:text-4xl font-black w-12 sm:w-16 text-center neon-text shrink-0">
                #{leader.rank}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-2xl font-bold text-white truncate">{leader.name}</h3>
                <p className="text-neon-cyan font-mono text-sm sm:text-base">ELO: {leader.elo}</p>
              </div>
              <div className="text-right shrink-0">
                {leader.streak > 3 && (
                  <span className="text-base sm:text-xl text-amber-400">🔥 {leader.streak} maclik seri!</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
