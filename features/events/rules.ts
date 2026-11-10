export type RegistrationEvent = { status: string; startsAt: Date; registrationOpen: boolean; registrationStartsAt: Date | null; registrationEndsAt: Date | null; capacity: number | null; publishedAt: Date | null };
export function registrationAvailability(event: RegistrationEvent, occupied: number, now = new Date()) {
  if (event.status === "CANCELED") return { open: false, code: "CANCELED", label: "Evento cancelado" };
  if (event.status !== "PUBLISHED" || !event.publishedAt || event.publishedAt > now || !event.registrationOpen || event.startsAt <= now || event.registrationEndsAt && event.registrationEndsAt <= now) return { open: false, code: "CLOSED", label: "Inscrições encerradas" };
  if (event.registrationStartsAt && event.registrationStartsAt > now) return { open: false, code: "NOT_YET", label: "Inscrições ainda não abertas" };
  if (event.capacity !== null && occupied >= event.capacity) return { open: false, code: "FULL", label: "Evento lotado" };
  return { open: true, code: "OPEN", label: event.capacity === null ? "Inscrições abertas" : `${event.capacity - occupied} vaga(s) disponível(is)` };
}
export function csvCell(value: unknown) { const text = String(value ?? ""); return `"${(/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`; }
