// A transport error after COMMIT is ambiguous: never delete a referenced file.
export async function compensateUncommittedObject({ references, remove, onUncertain }: { references: () => Promise<number>; remove: () => Promise<void>; onUncertain: () => Promise<void> }) {
  try { if (await references()) return "REFERENCED"; await remove(); return "REMOVED"; }
  catch { try { await onUncertain(); } catch { /* Preserve uncertain files even when logging is unavailable. */ } return "RETAINED_FOR_REVIEW"; }
}
