import React, { useState, useEffect } from 'react';
import { Terminal, Zap, Cpu, ShieldCheck, Database, GitBranch, BarChart3, PlayCircle, Rocket, BookOpen } from 'lucide-react';

interface CyberLandingProps {
  onGetStarted?: () => void;
}

const CyberLanding: React.FC<CyberLandingProps> = ({ onGetStarted }) => {
  const [currentLine, setCurrentLine] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLine((prev) => (prev < 8 ? prev + 1 : prev));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const terminalLines = [
    { type: 'prompt', text: '$ sudo initialize --mode=secure' },
    { type: 'success', text: '✓ Initializing neural network...' },
    { type: 'success', text: '✓ Loading quantum encryption layer...' },
    { type: 'info', text: '→ Establishing secure connection [443/TCP]' },
    { type: 'success', text: '✓ Authentication successful' },
    { type: 'warning', text: '! Elevated privileges granted' },
    { type: 'info', text: '→ System ready. Awaiting commands...' },
    { type: 'prompt', text: '$ access --level=admin --framework=COSTAR' },
    { type: 'success', text: '✓ Framework loaded. Ready for prompt engineering.' },
  ];

  const features = [
    {
      icon: Cpu,
      title: 'Neural Processing',
      description: 'Advanced AI frameworks with real-time reasoning. Auto-selects from 50+ optimization patterns.',
    },
    {
      icon: ShieldCheck,
      title: 'Quantum Encryption',
      description: 'Military-grade security protocols. End-to-end encryption with multi-layer authentication.',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Sub-millisecond response times. Optimized for high-frequency operations and real-time streams.',
    },
    {
      icon: Database,
      title: 'RAG Engine',
      description: 'Semantic search with pgvector. Knowledge base templates with intelligent chunking workflows.',
    },
    {
      icon: GitBranch,
      title: 'Multi-Agent Tasks',
      description: 'Agent control center with parallel execution. Chain complex workflows with precision routing.',
    },
    {
      icon: BarChart3,
      title: 'Live Analytics',
      description: 'Real-time performance metrics. Provider comparison, usage tracking, and KPI dashboards.',
    },
  ];

  const stats = [
    { value: '50+', label: 'AI Frameworks' },
    { value: '10+', label: 'LLM Providers' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '<1ms', label: 'Response Time' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Grid Background */}
      <div className="cyber-grid-bg fixed inset-0 z-0" />
      
      {/* Scanline Effect */}
      <div className="cyber-scanline fixed left-0 right-0 top-0 z-[9999] h-[2px] pointer-events-none" />
      
      {/* Noise Overlay */}
      <div className="cyber-noise fixed inset-0 z-[9998] pointer-events-none opacity-40" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neon-primary/15 py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-neon-primary to-neon-secondary shadow-neon-glow">
              <Terminal size={18} className="text-black" />
            </div>
            <span className="font-mono text-lg font-semibold tracking-wide text-neon-primary cyber-glow">
              NEOMAGIC_SYS
            </span>
          </div>

          <nav className="hidden gap-8 md:flex">
            {['FEATURES', 'METRICS', 'ACCESS', 'DOCS'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="cyber-nav-link font-mono text-[13px] tracking-wide text-slate-400 transition-all hover:text-neon-primary hover:cyber-glow"
              >
                {item}
              </a>
            ))}
          </nav>
        </header>

        {/* Hero Section */}
        <section className="py-24 md:py-32">
          <div className="mb-8 flex flex-wrap gap-4">
            {['System Online', 'Access Granted', 'Interface Ready'].map((status) => (
              <div
                key={status}
                className="cyber-status-badge inline-flex items-center gap-2 rounded-full border border-neon-primary/30 bg-neon-primary/8 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-neon-primary"
              >
                <span className="cyber-status-dot h-1.5 w-1.5 rounded-full bg-neon-primary" />
                {status}
              </div>
            ))}
          </div>

          <h1 className="cyber-title mb-6 font-mono text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            CYBER TERMINAL
            <br />
            ACCESS GRANTED
          </h1>

          <p className="mb-12 max-w-2xl font-mono text-lg leading-relaxed text-slate-400 md:text-xl">
            Next-generation command interface. Real-time data streams. Military-grade encryption. Your
            gateway to the digital frontier.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={onGetStarted}
              className="cyber-btn-primary inline-flex items-center gap-3 rounded-lg border border-neon-primary bg-gradient-to-r from-neon-primary to-neon-secondary px-8 py-4 font-mono text-sm font-semibold text-black shadow-neon-glow transition-all hover:shadow-neon-glow-lg hover:-translate-y-0.5"
            >
              <Zap size={18} />
              Initialize System
            </button>
            <button className="cyber-btn-secondary inline-flex items-center gap-3 rounded-lg border border-neon-primary/40 bg-neon-primary/5 px-8 py-4 font-mono text-sm font-semibold text-neon-primary transition-all hover:bg-neon-primary/12 hover:shadow-neon-soft">
              <PlayCircle size={18} />
              Watch Demo
            </button>
          </div>

          {/* Terminal Window */}
          <div className="cyber-terminal mt-20 overflow-hidden rounded-2xl border border-neon-primary/30 bg-gradient-to-b from-slate-950/95 to-black/98 shadow-2xl shadow-neon-primary/20">
            <div className="flex items-center justify-between border-b border-neon-primary/30 bg-neon-primary/8 px-5 py-4">
              <div className="flex gap-2">
                {['#FF5F56', '#FFBD2E', '#27C93F'].map((color, i) => (
                  <div
                    key={i}
                    className="h-3 w-3 rounded-full"
                    style={{ background: color, boxShadow: `0 0 10px ${color}80` }}
                  />
                ))}
              </div>
              <div className="font-mono text-xs tracking-wide text-neon-primary">
                terminal@neomagic:~$
              </div>
              <div className="w-16" />
            </div>

            <div className="min-h-[400px] p-8 font-mono text-sm leading-loose text-neon-primary">
              {terminalLines.slice(0, currentLine + 1).map((line, idx) => (
                <div
                  key={idx}
                  className="cyber-terminal-line mb-2 animate-fadeIn"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {line.type === 'prompt' && <span className="text-neon-secondary">$ </span>}
                  {line.type === 'success' && <span className="text-neon-primary">✓ </span>}
                  {line.type === 'warning' && <span className="text-amber-400">! </span>}
                  {line.type === 'info' && <span className="text-cyan-400">→ </span>}
                  {line.text}
                  {idx === currentLine && currentLine === terminalLines.length - 1 && (
                    <span className="cyber-cursor ml-1 inline-block h-4 w-2 animate-blink bg-neon-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24">
          <div className="mb-16 text-center">
            <div className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-neon-secondary">
              CORE CAPABILITIES
            </div>
            <h2 className="cyber-title mb-4 font-mono text-4xl font-bold md:text-5xl">
              System Features
            </h2>
            <p className="mx-auto max-w-2xl font-mono text-base text-slate-400">
              Built for speed. Engineered for precision. Designed for the future.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="cyber-feature-card group relative overflow-hidden rounded-2xl border border-neon-primary/20 bg-gradient-to-b from-slate-950/80 to-black/90 p-8 transition-all hover:-translate-y-1 hover:border-neon-primary/50 hover:shadow-2xl hover:shadow-neon-primary/20"
              >
                <div className="cyber-feature-glow absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-neon-primary to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-neon-primary/30 bg-gradient-to-br from-neon-primary/20 to-neon-secondary/20 shadow-neon-soft">
                  <feature.icon size={24} className="text-neon-primary" />
                </div>
                
                <h3 className="mb-3 font-mono text-lg font-semibold text-slate-100">
                  {feature.title}
                </h3>
                
                <p className="font-mono text-[13px] leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section id="metrics" className="border-y border-neon-primary/10 bg-neon-primary/3 py-20">
          <div className="grid gap-12 text-center md:grid-cols-4">
            {stats.map((stat, idx) => (
              <div key={idx}>
                <div className="cyber-stat-value mb-2 font-mono text-6xl font-bold">
                  {stat.value}
                </div>
                <div className="font-mono text-sm uppercase tracking-widest text-slate-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section id="access" className="py-24">
          <div className="cyber-cta-box relative overflow-hidden rounded-3xl border border-neon-primary/30 bg-gradient-to-b from-slate-950/90 to-black/95 p-16 text-center shadow-2xl shadow-neon-primary/15">
            <div className="cyber-cta-glow absolute left-1/2 top-0 h-full w-full -translate-x-1/2" />
            
            <h2 className="cyber-title relative z-10 mb-6 font-mono text-4xl font-bold md:text-5xl">
              Ready to Access the System?
            </h2>
            
            <p className="relative z-10 mb-10 font-mono text-base text-slate-400">
              Join the future of prompt engineering. Initialize your workspace now.
            </p>
            
            <div className="relative z-10 flex flex-wrap justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="cyber-btn-primary inline-flex items-center gap-3 rounded-lg border border-neon-primary bg-gradient-to-r from-neon-primary to-neon-secondary px-8 py-4 font-mono text-sm font-semibold text-black shadow-neon-glow transition-all hover:shadow-neon-glow-lg hover:-translate-y-0.5"
              >
                <Rocket size={18} />
                Start Free Trial
              </button>
              <button className="cyber-btn-secondary inline-flex items-center gap-3 rounded-lg border border-neon-primary/40 bg-neon-primary/5 px-8 py-4 font-mono text-sm font-semibold text-neon-primary transition-all hover:bg-neon-primary/12 hover:shadow-neon-soft">
                <BookOpen size={18} />
                Read Documentation
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-neon-primary/15 py-12 text-center">
          <p className="font-mono text-[13px] text-slate-500">
            © 2026 NeoMagic Systems. Built with{' '}
            <a href="#" className="text-neon-primary hover:cyber-glow">
              quantum tech
            </a>
            . Powered by{' '}
            <a href="#" className="text-neon-primary hover:cyber-glow">
              neural networks
            </a>
            .
          </p>
        </footer>
      </div>

      <style>{`
        .cyber-grid-bg {
          background:
            linear-gradient(90deg, rgba(0, 255, 159, 0.03) 1px, transparent 1px),
            linear-gradient(0deg, rgba(0, 255, 159, 0.03) 1px, transparent 1px),
            radial-gradient(circle at 20% 20%, rgba(0, 255, 159, 0.15), transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(138, 43, 226, 0.12), transparent 50%),
            linear-gradient(180deg, #000000 0%, #0a0e1a 50%, #000000 100%);
          background-size: 60px 60px, 60px 60px, 100% 100%, 100% 100%, 100% 100%;
          animation: gridPulse 8s ease-in-out infinite;
        }

        @keyframes gridPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.85; }
        }

        .cyber-scanline {
          background: linear-gradient(to bottom, transparent, rgba(0, 255, 159, 0.5), transparent);
          animation: scan 4s linear infinite;
          opacity: 0.3;
        }

        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }

        .cyber-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
        }

        .cyber-glow {
          text-shadow: 0 0 20px rgba(0, 255, 159, 0.6);
        }

        .cyber-title {
          background: linear-gradient(135deg, #00FF9F 0%, #00BFFF 50%, #8A2BE2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .cyber-status-dot {
          box-shadow: 0 0 10px #00FF9F;
          animation: blink 1.5s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .cyber-cursor {
          animation: cursorBlink 1s step-end infinite;
        }

        @keyframes cursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .cyber-stat-value {
          background: linear-gradient(135deg, #00FF9F 0%, #00BFFF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .cyber-cta-glow {
          background: radial-gradient(circle, rgba(0, 255, 159, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default CyberLanding;
