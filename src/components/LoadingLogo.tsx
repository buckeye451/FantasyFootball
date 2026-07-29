/* eslint-disable @next/next/no-img-element */

/**
 * The breathing-badge loading state.
 *
 * Deliberately pure CSS and pure markup — a loading screen that waits on
 * JavaScript to animate is a loading screen for the loading screen. It reuses
 * the header's logo URL so the browser already has it cached by the time any
 * navigation can happen.
 */
export function LoadingLogo({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <img src="/hero/logo.svg" alt="" className="loading-logo" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
