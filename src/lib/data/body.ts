// R2, the muscle map (after Strava's strength activity, which shows the body where a run shows its map): the body's
// drawn parts and which of Ontrack's ten muscles each one is. The path data loads on first use (body-male.ts,
// body-female.ts), so only Train and the workout summary pay for it.
import type { Muscle } from '$lib/model/engine';

export type Side = { viewBox: string; outline: string; parts: Record<string, string[]> };
export type Body = { front: Side; back: Side };

/** The drawn part each muscle lights; the rest of the body (head, hands, knees, forearms) stays the body's grey. */
export const PARTS: Record<Muscle, string[]> = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back', 'trapezius'],
  shoulders: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  core: ['abs', 'obliques'],
};

/** The map's fills: the body's grey, then three violet steps (tokens only), shared with the legends. */
export const MUSCLE_STEPS = ['var(--track-bg)', 'color-mix(in srgb, var(--progress) 35%, var(--track-bg))', 'color-mix(in srgb, var(--progress) 68%, var(--track-bg))', 'var(--progress)'];

/** The muscle a drawn part belongs to, or none. */
export const muscleOf: Record<string, Muscle> = Object.fromEntries(
  (Object.entries(PARTS) as [Muscle, string[]][]).flatMap(([m, parts]) => parts.map((p) => [p, m])),
);

/** The body to draw: the female outline for a female profile, else the male one. */
export const loadBody = (sex: string | undefined): Promise<Body> =>
  sex === 'female' ? import('./body-female').then((m) => m.BODY) : import('./body-male').then((m) => m.BODY);
