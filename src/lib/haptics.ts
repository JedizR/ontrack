// Haptics, and motion that respects the reduced motion setting.
import { scale, type TransitionConfig } from 'svelte/transition';
import { backOut, cubicOut } from 'svelte/easing';
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
/** A duration token in ms ("--d-step"): JavaScript keeps to the tokens too. A wait's pacing, which is not motion. */
export const ms = (token: `--d-${string}`) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)) || 0;
/** A motion token's duration in ms ("--d-count"), 0 under reduced motion. */
export const dur = (token: `--d-${string}`) => (reducedMotion() ? 0 : ms(token));

/**
 * A row or card coming or going: its height, its opacity, and the gap of a flex parent, so the things below move up or
 * down with it and nothing jumps at the end. Arrives over --d-move, leaves over --d-leave.
 */
export function collapse(node: HTMLElement, { leave = false } = {}): TransitionConfig {
  const h = node.offsetHeight;
  const gap = parseFloat(getComputedStyle(node.parentElement ?? node).rowGap) || 0;
  return {
    duration: dur(leave ? '--d-leave' : '--d-move'),
    easing: cubicOut,
    css: (t) => `overflow: hidden; height: ${t * h}px; margin-bottom: ${(t - 1) * gap}px; opacity: ${t}`,
  };
}

/** A check or mark arriving: it grows past its size and settles (--d-pop). Only when its state changes, never on a first paint. */
export const pop = (node: Element) => scale(node, { start: 0.4, duration: dur('--d-pop'), easing: backOut });
