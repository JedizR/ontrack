// Haptics and motion preferences.
import { isIOS } from './platform';

/**
 * A light tap. Android: Vibration API. iPhone has no Vibration API, but iOS 18+ plays the system
 * haptic when a native <input switch> is toggled from a user gesture, so we toggle a hidden one.
 */
export function haptic() {
  try {
    if (navigator.vibrate?.(10)) return;
  } catch { /* unsupported */ }
  if (!isIOS()) return;
  const label = document.createElement('label');
  label.ariaHidden = 'true';
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.appendChild(input);
  document.head.appendChild(label);
  label.click();
  label.remove();
}

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Transition duration that collapses to 0 under reduced motion. */
export const dur = (ms: number) => (reducedMotion() ? 0 : ms);
