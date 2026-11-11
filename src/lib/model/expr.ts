/** Keypad input is digits, ".", and "+" (to add amounts up: "250+180"). Ported from watermelon. */
export function evalSum(expr: string): number {
  return expr.split('+').reduce((s, t) => s + (Number.parseFloat(t) || 0), 0);
}

/** Apply one keypad key to the current expression. */
export function pressKey(expr: string, key: string, opts: { decimal: boolean; plus: boolean }): string {
  const term = expr.split('+').at(-1) ?? '';
  switch (key) {
    case 'back':
      return expr.slice(0, -1);
    case 'clear':
      return '';
    case '+':
      if (!opts.plus || term === '' || term === '.') return expr;
      return expr + '+';
    case '.':
      if (!opts.decimal || term.includes('.')) return expr;
      return expr + (term === '' ? '0.' : '.');
    default: {
      // digits and '00'; cap decimals at 2 and length at 9 per term
      if (term.includes('.') && term.split('.')[1].length >= 2) return expr;
      if (term.replace('.', '').length >= 9) return expr;
      if (term === '0') return expr.slice(0, -1) + (key === '00' ? '0' : key);
      if (term === '' && key === '00') return expr + '0';
      return expr + key;
    }
  }
}

/** Starting expression for a value (empty for 0/null so the first key replaces it). */
export const exprFrom = (v: number | null | undefined) => (v ? String(Math.round(v * 100) / 100) : '');
