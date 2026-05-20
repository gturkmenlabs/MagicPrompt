import React from 'react';
import { ArrowRight, ListChecks, Sparkles } from 'lucide-react';
import type { PageConfig } from '@/types/ui';

interface WorkspaceBriefingProps {
  config: PageConfig;
}

export function WorkspaceBriefing({ config }: WorkspaceBriefingProps) {
  const hasContent = config.aiSummary || config.onThisPage?.length || config.intentCluster?.length;
  if (!hasContent) return null;

  return (
    <section className="workspace-briefing" aria-labelledby="workspace-briefing-title">
      <div className="workspace-briefing__summary">
        <div className="workspace-briefing__icon" aria-hidden="true">
          <Sparkles size={16} />
        </div>
        <div className="min-w-0">
          <p className="workspace-briefing__eyebrow">{config.eyebrow || 'Workspace'}</p>
          <h2 id="workspace-briefing-title" className="workspace-briefing__title">
            {config.aiSummary ?? config.description}
          </h2>
        </div>
      </div>

      {config.onThisPage?.length ? (
        <div className="workspace-briefing__panel" aria-label="On this page">
          <ListChecks size={15} className="workspace-briefing__panel-icon" aria-hidden="true" />
          <div className="workspace-briefing__items">
            {config.onThisPage.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      ) : null}

      {config.intentCluster?.length ? (
        <div className="workspace-briefing__cluster" aria-label="Semantic intent cluster">
          {config.intentCluster.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}

      {config.nextBestAction ? (
        <p className="workspace-briefing__next">
          {config.nextBestAction}
          <ArrowRight size={14} aria-hidden="true" />
        </p>
      ) : null}
    </section>
  );
}

export default WorkspaceBriefing;
