/**
 * Single on/off switch for whether browser DevTools shortcuts (F12,
 * Ctrl+Shift+I/J/C, Cmd+Opt+I/J/C, Ctrl+U) and the right-click context menu
 * are blocked across the whole app.
 *
 * Set to `true`  → DevTools accessible as normal (no blocking).
 * Set to `false` → DevTools shortcuts + right-click are blocked.
 *
 * This is a deterrent only, NOT real security — DevTools can still be opened
 * via the browser's own menu, and this can be bypassed by anyone with basic
 * knowledge. Never rely on this to protect sensitive data or logic; anything
 * sensitive must stay server-side regardless of this setting.
 */
export const DEV_TOOLS_ACCESSIBLE = false;