export function validTimezone(value: string) { try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; } }
export function localInput(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (key: string) => parts.find(p => p.type === key)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function zonedInstant(value: string, timezone: string): Date {
  if (!validTimezone(timezone)) throw new Error("Fuso horário inválido.");
  const date = value.slice(0, 10), calendarDay = Date.parse(`${date}T12:00:00Z`);
  if (!Number.isFinite(calendarDay) || new Date(calendarDay).toISOString().slice(0, 10) !== date) throw new Error("Data inválida.");
  if (/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) { const instant = new Date(value); if (Number.isFinite(instant.getTime())) return instant; }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Informe uma data e horário válidos.");
  const guess = Date.parse(`${value}Z`); if (!Number.isFinite(guess)) throw new Error("Data inválida.");
  const candidates = new Set<number>();
  for (const hours of [-36, -12, 0, 12, 36]) {
    const probe = guess + hours * 3600000;
    const offset = Date.parse(`${localInput(new Date(probe), timezone)}Z`) - probe;
    const candidate = guess - offset;
    if (localInput(new Date(candidate), timezone) === value) candidates.add(candidate);
  }
  if (candidates.size !== 1) throw new Error("Horário inexistente ou ambíguo neste fuso. Revise a data ou use ISO com offset explícito.");
  return new Date([...candidates][0]);
}
export function eventDate(date: Date, timezone: string) { return date.toLocaleDateString("pt-BR", { timeZone: timezone, day: "2-digit", month: "long", year: "numeric" }); }
export function eventTime(date: Date, timezone: string) { return date.toLocaleTimeString("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }); }
export function dayKey(date: Date, timezone: string) { return localInput(date, timezone).slice(0, 10); }
export function eventDaysInMonth(start: Date, end: Date, timezone: string, month: string) {
  const first = dayKey(start, timezone), last = dayKey(new Date(+end - 1), timezone);
  const date = new Date(`${month}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return Array.from({ length: date.getUTCDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`).filter(day => day >= first && day <= last);
}
