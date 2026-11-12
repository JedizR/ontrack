// The day Today shows. A past day stays picked until Back to today; the calendar day follows the clock, since the
// installed app can stay open past midnight.
import { today } from '$lib/model/dates';

class View {
  today = $state(today());
  #picked = $state<string | null>(null);

  /** the day on screen, and the day new meals are logged to */
  get date() { return this.#picked !== null && this.#picked < this.today ? this.#picked : this.today; }
  set date(d: string) { this.#picked = d < this.today ? d : null; }
  get past() { return this.date !== this.today; }
  tick() { this.today = today(); }
}

export const view = new View();
