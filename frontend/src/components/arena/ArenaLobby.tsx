import { GlassCard } from '../ui';

export interface ArenaLobbyProps {
  onStartBattle: () => void;
}

export function ArenaLobby({ onStartBattle }: ArenaLobbyProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-slate-950 to-purple-950 px-4">
      <h1 className="neon-text text-5xl sm:text-6xl font-black mb-6 sm:mb-8 tracking-wider animate-glow-pulse">
        PROMPT ARENA
      </h1>
      <p className="text-lg sm:text-xl text-gray-300 mb-10 sm:mb-12 max-w-2xl text-center">
        En iyi prompt senin mi? Kor savasta rakiplerini yen, Elo puaninla zirveye cik!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16 w-full max-w-4xl">
        <GlassCard neon="cyan" intensity="high" className="text-center p-6 sm:p-8">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🏆</div>
          <h3 className="text-xl sm:text-2xl font-bold neon-text">Global Liderlik</h3>
          <p className="mt-2 text-gray-400 text-sm sm:text-base">En yuksek Elo sahibi ol</p>
        </GlassCard>

        <GlassCard neon="purple" intensity="high" className="text-center p-6 sm:p-8">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">⚔️</div>
          <h3 className="text-xl sm:text-2xl font-bold neon-text">Kor Savas</h3>
          <p className="mt-2 text-gray-400 text-sm sm:text-base">Prompt isimleri gizli – sadece kalite konusur</p>
        </GlassCard>

        <GlassCard neon="pink" intensity="high" className="text-center p-6 sm:p-8">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🔥</div>
          <h3 className="text-xl sm:text-2xl font-bold neon-text">Hot Streak</h3>
          <p className="mt-2 text-gray-400 text-sm sm:text-base">5 mac ust uste kazan, badge kap</p>
        </GlassCard>
      </div>

      <button
        type="button"
        onClick={onStartBattle}
        className="neon-btn px-8 sm:px-12 py-4 sm:py-6 text-xl sm:text-2xl font-bold shadow-[0_0_30px_rgba(0,247,255,0.5)] animate-pulse hover:animate-none"
      >
        SIMDI SAVASA BASLA
      </button>
    </div>
  );
}
