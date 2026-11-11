import { clsx, type ClassValue } from 'clsx';

// shortcut: plain clsx (no tailwind-merge) since callers only add non-conflicting classes; upgrade if overrides start to clash
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
