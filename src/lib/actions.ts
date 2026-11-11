// Every change a user makes goes through here: components call these, these call the store (from M3).
import { toast } from 'svelte-sonner';
import { t } from '$lib/i18n';

/** One undo at a time: a new undo toast replaces the last, so Undo is never ambiguous. */
let undoId: string | number | undefined;
/** Closes the undo toast only: a bare toast.dismiss() would also close the update toast. */
export function dismissUndo() {
  if (undoId !== undefined) toast.dismiss(undoId);
  undoId = undefined;
}
export function undoToast(message: string, onUndo: () => void, duration = 5000) {
  dismissUndo();
  undoId = toast(message, { duration, action: { label: t.toast.undo, onClick: onUndo } });
}
