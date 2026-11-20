import { t } from '$lib/i18n';
import type { Session } from '../../shared/records';

/** 19 and 21 Nov, the owner: a session named only by its kind shows its machine ("Treadmill"), with the kind under it, as a
 *  strength session shows its name over Strength. Cardio with no machine set is the session sheet's default, the
 *  treadmill. Today's boxes and Train's Up next use it. */
export const sessionTitle = (s: Session) =>
  s.name === t.train.types[s.type] && (s.setup || s.type === 'cardio') ? t.train.machines[s.setup?.machine ?? 'treadmill'] : s.name;
