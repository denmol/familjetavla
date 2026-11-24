import type { SourcedEvent } from "./sources.js";
import { loadLocal, saveLocal } from "./store.js";
import { dayKey } from "./time.js";
import type { CalendarSource, DashTravel, Person, TravelChoice, TravelLeg, TravelMode } from "./types.js";

/**
 * Stable key for one occurrence. With a UID (all ICS/HA events) it is calendar + UID + date, so a
 * training moved from 17:30 to 17:45 keeps its choice. Without one: calendar + start time.
 */
export function travelKey(ev: Pick<SourcedEvent, "sourceId" | "start" | "uid">): string {
  return ev.uid ? `${ev.sourceId}@${ev.uid}@${dayKey(ev.start)}` : legacyTravelKey(ev);
}
function legacyTravelKey(ev: Pick<SourcedEvent, "sourceId" | "start">): string {
  return `${ev.sourceId}@${ev.start.toISOString()}`;
}
export const isCare = (sourceId: string) => sourceId.startsWith("care:");

/** Children's own activities (sport, family events tagged to a child) – not school lessons or all-day events. */
export function wantsTravel(ev: SourcedEvent, people: Map<string, Person>): boolean {
  const p = ev.personId ? people.get(ev.personId) : undefined;
  return Boolean(p && p.kind === "child" && !ev.allDay && !ev.sourceId.startsWith("school:"));
}

export function travelOptions(people: Map<string, Person>): { mode: TravelMode; label: string }[] {
  const adults = [...people.values()].filter((p) => p.kind === "adult");
  return [
    ...adults.map((a) => ({ mode: `adult:${a.id}` as TravelMode, label: `${a.name} skjutsar` })),
    { mode: "ride", label: "Annan skjutsar" },
    { mode: "bus", label: "Buss" },
    { mode: "self", label: "Cyklar/går" },
  ];
}

export function legLabel(leg: TravelLeg, people: Map<string, Person>, care = false): string {
  if (leg.mode === "bus") return "Buss";
  if (leg.mode === "self") return care ? "Går själv" : "Cyklar/går";
  if (leg.mode === "ride") return care ? leg.by || "Någon annan" : leg.by ? `${leg.by} skjutsar` : "Annan skjutsar";
  const p = people.get(leg.mode.slice(6));
  return p ? (care ? p.name : `${p.name} skjutsar`) : "Skjuts";
}

/** Per-event choices in local.json, falling back to the calendar's default. */
export function resolveTravel(ev: SourcedEvent, people: Map<string, Person>, cal: CalendarSource | undefined, saved: Record<string, TravelChoice>): DashTravel {
  const key = travelKey(ev);
  const own = saved[key] ?? saved[legacyTravelKey(ev)];
  const choice = own ?? cal?.travel ?? {};
  const care = isCare(ev.sourceId);
  const fmt = (l?: TravelLeg) => (l ? { ...l, label: legLabel(l, people, care) } : undefined);
  return {
    key,
    calendarId: cal?.id,
    calendarName: cal?.name,
    to: fmt(choice.to),
    home: fmt(choice.home),
    fromCalendar: !own && Boolean(cal?.travel && (cal.travel.to || cal.travel.home)),
    ...(care ? { kind: "care" as const } : {}),
  };
}

/** "Emil skjutsar dit · buss hem" for reminders and the Nu-zon. */
export function travelSummary(t: DashTravel | undefined): string {
  if (!t || (!t.to && !t.home)) return "";
  if (t.kind === "care")
    return [t.to && (t.to.mode === "self" ? "Går själv dit" : `${t.to.label} lämnar`), t.home && (t.home.mode === "self" ? "Går hem själv" : `${t.home.label} hämtar`)]
      .filter(Boolean)
      .join(" · ");
  if (t.to && t.home && t.to.label === t.home.label) return `${t.to.label} dit och hem`;
  return [t.to && `${t.to.label} dit`, t.home && `${lower(t.home.label)} hem`].filter(Boolean).join(" · ").replace(/^./, (c) => c.toUpperCase());
}
const lower = (s: string) => (/ skjutsar$/.test(s) ? s : s[0].toLowerCase() + s.slice(1));

/** Names used for "Annan skjutsar", most recent first. */
export function knownDrivers(): string[] {
  return loadLocal().drivers ?? [];
}
function rememberDrivers(choice: TravelChoice | null) {
  const names = [choice?.to?.by, choice?.home?.by].map((n) => n?.trim()).filter((n): n is string => Boolean(n));
  if (!names.length) return;
  const list = [...names, ...knownDrivers()].filter((n, i, all) => all.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i);
  saveLocal({ drivers: list.slice(0, 12) });
}

export function loadTravel(): Record<string, TravelChoice> {
  return loadLocal().travel ?? {};
}

/** Save one event's choice (null clears it). Old entries are dropped after two days. */
export function saveTravel(key: string, choice: TravelChoice | null, now = new Date()) {
  rememberDrivers(choice);
  const all = { ...loadTravel() };
  if (choice && (choice.to || choice.home)) all[key] = choice;
  else delete all[key];
  const cutoff = now.getTime() - 2 * 86_400_000;
  for (const k of Object.keys(all)) {
    const t = Date.parse(k.slice(k.lastIndexOf("@") + 1)); // ISO time or YYYY-MM-DD
    if (Number.isFinite(t) && t < cutoff) delete all[k];
  }
  saveLocal({ travel: all });
}
