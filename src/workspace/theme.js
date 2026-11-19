import { themeDark } from 'dockview-vue';

// Migration: pair with skin.css, not the demo's style.css. No window/storage work
// happens here. In Nuxt, import in a client workspace component / use ClientOnly.
// 14px engine gutter = 10px grab target + 2px clearance each side. Changing gap
// independently of skin.css can make the sash cover a native scrollbar again.
export function createWorkspaceTheme({ name = 'workspace-dark' } = {}) {
  return { ...themeDark, name, gap: 14 };
}

export const workspaceTheme = createWorkspaceTheme();
export const workspaceOptions = { theme: workspaceTheme, hideBorders: true };
