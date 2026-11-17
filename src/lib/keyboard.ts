// R1, the owner: "the iOS keyboard pushes the UI up, or covers the bottom drawer". iOS does not resize the page for the
// keyboard: it overlays the bottom of the layout viewport and, to show the focused field, pans the visual viewport. So
// anything pinned to the bottom (a sheet, the onboarding action bar) sat under the keyboard. This publishes how much of
// the layout viewport the keyboard covers (--kb) and how tall the visible part is (--vvh) while a field has focus, and
// the pinned things lift by --kb and stay inside --vvh. Not typing, both are unset and the layout is untouched.

export function trackKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return () => undefined;
  const root = document.documentElement;
  const typing = () => !!document.activeElement?.matches('input:not([type=checkbox]):not([type=radio]), textarea, [contenteditable="true"]');
  const set = () => {
    // the layout viewport's bottom minus the visual viewport's: the keyboard, plus any pan
    const kb = Math.round(window.innerHeight - vv.height - vv.offsetTop);
    if (typing() && kb > 80) {
      root.style.setProperty('--kb', `${kb}px`);
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      root.style.setProperty('--kb-safe', '0px');
    } else {
      root.style.removeProperty('--kb');
      root.style.removeProperty('--vvh');
      root.style.removeProperty('--kb-safe');
    }
  };
  vv.addEventListener('resize', set);
  vv.addEventListener('scroll', set);
  addEventListener('focusin', set);
  addEventListener('focusout', set);
  return () => {
    vv.removeEventListener('resize', set);
    vv.removeEventListener('scroll', set);
    removeEventListener('focusin', set);
    removeEventListener('focusout', set);
    root.style.removeProperty('--kb');
    root.style.removeProperty('--vvh');
    root.style.removeProperty('--kb-safe');
  };
}
