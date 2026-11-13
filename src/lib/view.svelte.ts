// The day Today shows. A past day stays picked until Back to today; the calendar day follows the clock, since the
// tab can stay open past midnight.
import { nowIso, timeOf, today } from '$lib/model/dates';

class View {
  today = $state(today());
  /** the time of day, HH:MM, to the minute: the evening cards follow it (M9a) */
  time = $state(timeOf(nowIso()));
  #picked = $state<string | null>(null);

  /** the day on screen, and the day new meals are logged to */
  get date() { return this.#picked !== null && this.#picked < this.today ? this.#picked : this.today; }
  set date(d: string) { this.#picked = d < this.today ? d : null; }
  get past() { return this.date !== this.today; }
  tick() { this.today = today(); this.time = timeOf(nowIso()); }
}

export const view = new View();
