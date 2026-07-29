import { useEffect } from 'react';
import { DEV_TOOLS_ACCESSIBLE } from '../config/devTools';

const BLOCKED_LETTERS = ['I', 'i', 'J', 'j', 'C', 'c'];

/**
 * Printed straight to the console on load, so it's already sitting there
 * however DevTools ends up getting opened — shortcuts, right-click, or the
 * browser's own menu (which this app has no way to block; DevTools panel
 * visibility is controlled entirely by the browser, not the page).
 */
function printConsoleWarning() {
  console.log(
    '%cStop!',
    'color: #dc2626; font-size: 48px; font-weight: 700; -webkit-text-stroke: 1px #7f1d1d;',
  );
  console.log(
    '%cThis is a browser feature intended for developers. If someone told you to copy/paste ' +
    'something here, it is likely an attempt to compromise your account — do not do it.',
    'color: #334155; font-size: 14px;',
  );
}

/**
 * Blocks the common DevTools-opening shortcuts and the right-click context
 * menu whenever DEV_TOOLS_ACCESSIBLE is false. No-ops entirely when true.
 * Mount once near the app root — see App.tsx.
 */
export function useDevToolsGuard() {
  useEffect(() => {
    if (DEV_TOOLS_ACCESSIBLE) return;

    printConsoleWarning();

    const blockKeys = (e: KeyboardEvent) => {
      const blocked =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && BLOCKED_LETTERS.includes(e.key)) || // Win/Linux: Ctrl+Shift+I/J/C
        (e.metaKey && e.altKey && BLOCKED_LETTERS.includes(e.key)) ||   // macOS: Cmd+Opt+I/J/C
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'));                // view-source

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('keydown', blockKeys);
    document.addEventListener('contextmenu', blockContextMenu);

    return () => {
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('contextmenu', blockContextMenu);
    };
  }, []);
}
