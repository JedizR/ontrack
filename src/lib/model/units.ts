// Stored in kg and cm; shown and typed in the user's units (TECH-SPEC section 11). Conversions are exact definitions.
import { num } from './format';
import { t } from '$lib/i18n';

export type Units = 'metric' | 'imperial';
const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const IN_PER_FT = 12;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const ftInToCm = (ft: number, inches: number) => (ft * IN_PER_FT + inches) * CM_PER_IN;
export function cmToFtIn(cm: number) {
  const total = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(total / IN_PER_FT), inches: total % IN_PER_FT };
}

/** A weight in the user's units, "72.5 kg" or "159.8 lb". */
export const weightText = (kg: number, u: Units, decimals = 1) =>
  u === 'metric' ? `${num(kg, decimals)} ${t.units.kg}` : `${num(kgToLb(kg), decimals)} ${t.units.lb}`;
/** A height in the user's units, "175 cm" or "5 ft 9 in". */
export function heightText(cm: number, u: Units) {
  if (u === 'metric') return `${num(cm, 0)} ${t.units.cm}`;
  const { ft, inches } = cmToFtIn(cm);
  return t.units.ftIn(String(ft), String(inches));
}
