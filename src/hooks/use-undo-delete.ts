import { toast } from "sonner";

const UNDO_DELAY_MS = 4000;

/**
 * Returns a `deleteWithUndo` function that:
 * 1. Removes the item from UI immediately (optimistic)
 * 2. Shows a "Deleted — Undo" toast for 4 seconds
 * 3. If the user clicks Undo → restores the item, no API call made
 * 4. If the timer expires → calls onConfirmDelete() to hit the server
 */
export function useUndoDelete() {
  function deleteWithUndo({
    label = "Entry deleted",
    onRemoveFromUI,
    onRestoreToUI,
    onConfirmDelete,
  }: {
    label?: string;
    onRemoveFromUI: () => void;
    onRestoreToUI: () => void;
    onConfirmDelete: () => Promise<void>;
  }) {
    onRemoveFromUI();

    let undone = false;

    const timerId = setTimeout(async () => {
      if (undone) return;
      try {
        await onConfirmDelete();
      } catch {
        toast.error("Failed to delete — please try again");
        onRestoreToUI();
      }
    }, UNDO_DELAY_MS);

    toast(label, {
      duration: UNDO_DELAY_MS,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          clearTimeout(timerId);
          onRestoreToUI();
        },
      },
    });
  }

  return { deleteWithUndo };
}
