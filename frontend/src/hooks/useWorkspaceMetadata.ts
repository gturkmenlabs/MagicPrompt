import { useEffect } from 'react';
import type { PageConfig } from '@/types/ui';
import { applyWorkspaceMetadata } from '@/services/workspaceMetadata';

export function useWorkspaceMetadata(config: PageConfig): void {
  useEffect(() => {
    applyWorkspaceMetadata(config);
  }, [config]);
}
