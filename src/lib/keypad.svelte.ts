// One keypad sheet for every number a person types: `await keypad.ask({...})`. Ported from watermelon.
export interface KeypadChip { label: string; value: number }
export interface KeypadOptions {
  title: string;
  value?: number | null;
  /** shown after the amount: kcal, g, kg */
  unit: string;
  /** allow a decimal point (weight), or whole numbers only (kcal, grams) */
  decimal?: boolean;
  chips?: KeypadChip[];
  /** caption above the amount while nothing is being added up */
  hint?: string;
  saveLabel?: (v: number) => string;
  allowZero?: boolean;
}
/** the number, or null when dismissed */
export type KeypadResult = number | null;

class Keypad {
  open = $state(false);
  opts = $state<KeypadOptions | null>(null);
  #resolve: ((r: KeypadResult) => void) | null = null;

  ask(opts: KeypadOptions): Promise<KeypadResult> {
    this.#resolve?.(null);
    this.opts = opts;
    this.open = true;
    return new Promise((res) => (this.#resolve = res));
  }
  finish(r: KeypadResult) {
    this.#resolve?.(r);
    this.#resolve = null;
    this.open = false;
  }
}

export const keypad = new Keypad();
