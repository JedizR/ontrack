// One wheel sheet for the bounded numbers asked in a sheet (weigh in, goal weight, body fat): `await picker.ask({...})`.
// Callers read a number, 0 for Clear, or null when the sheet was dismissed.
export interface PickerOptions {
  title: string;
  value: number;
  min: number;
  max: number;
  /** whole steps; a decimal value uses `decimals` */
  step?: number;
  decimals?: 0 | 1;
  unit: string;
  /** caption under the title */
  hint?: string;
  saveLabel?: (v: number) => string;
  /** offer Clear, which answers 0 */
  clearable?: boolean;
  /** a typed value outside min and max: the words that say the range */
  range?: string;
}
export type PickerResult = number | null;

class Picker {
  open = $state(false);
  opts = $state<PickerOptions | null>(null);
  #resolve: ((r: PickerResult) => void) | null = null;

  ask(opts: PickerOptions): Promise<PickerResult> {
    this.#resolve?.(null);
    this.opts = opts;
    this.open = true;
    return new Promise((res) => (this.#resolve = res));
  }
  finish(r: PickerResult) {
    this.#resolve?.(r);
    this.#resolve = null;
    this.open = false;
  }
}

export const picker = new Picker();
