import { createPage } from '@/lib/editing';
import { openPage } from '@/lib/navigation';

import type { Workspace } from './workspace';

/** Create an empty page (top level, or inside `parentId`) and open it. */
export function createAndOpenPage(workspace: Workspace, parentId: string | null): void {
  const result = createPage(workspace.getTree(), parentId, Date.now());
  workspace.apply(result.patch);
  openPage(result.patch.put[0].id);
}
