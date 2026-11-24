import { loadLocal, saveLocal } from "./store.js";
import { addDays, dayKey, isoWeekday, startOfDay } from "./time.js";
import type { Person } from "./types.js";

/** En syssla ett barn ska göra ("Plocka undan", "Borsta tänderna"). `days` = veckodagar 1 (mån) – 7 (sön); tom lista = alla dagar. */
export interface Chore {
  id: string;
  personId: string;
  title: string;
  days: number[];
}

export interface ChoresForPerson {
  personId: string;
  name: string;
  color: string;
  items: { id: string; title: string; done: boolean }[];
  /** Allt som skulle göras idag är gjort (och det fanns något att göra). */
  allDone: boolean;
}

export const loadChores = (): Chore[] => loadLocal().chores ?? [];

const clean = (c: Chore): Chore => ({
  id: String(c.id).slice(0, 40),
  personId: String(c.personId).slice(0, 40),
  title: String(c.title).trim().slice(0, 40),
  days: [...new Set((c.days ?? []).map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort(),
});

/** Spara listan med sysslor. Bocka-markeringar för sysslor som tagits bort rensas. */
export function saveChores(list: Chore[]) {
  const chores = list.map(clean).filter((c) => c.title && c.id && c.personId).slice(0, 80);
  const ids = new Set(chores.map((c) => c.id));
  const done = Object.fromEntries(Object.entries(loadLocal().choreDone ?? {}).map(([day, l]) => [day, l.filter((id) => ids.has(id))]));
  saveLocal({ chores, choreDone: done });
}

/** Bocka av (eller ångra) en syssla för en dag. Dagar äldre än två veckor rensas. */
export function setChoreDone(id: string, day: string, done: boolean, now = new Date()) {
  if (!loadChores().some((c) => c.id === id)) return false;
  const all = { ...(loadLocal().choreDone ?? {}) };
  const list = new Set(all[day] ?? []);
  if (done) list.add(id);
  else list.delete(id);
  all[day] = [...list];
  const cutoff = dayKey(addDays(startOfDay(now), -14));
  for (const k of Object.keys(all)) if (k < cutoff || all[k].length === 0) delete all[k];
  saveLocal({ choreDone: all });
  return true;
}

/** Dagens sysslor per barn (bara barn som har något att göra idag). */
export function choresForToday(people: Pick<Person, "id" | "name" | "color" | "kind">[], now: Date, chores = loadChores(), doneToday = new Set(loadLocal().choreDone?.[dayKey(now)] ?? [])): ChoresForPerson[] {
  const wd = isoWeekday(now);
  const out: ChoresForPerson[] = [];
  for (const p of people.filter((x) => x.kind === "child" && x.name)) {
    const items = chores
      .filter((c) => c.personId === p.id && (c.days.length === 0 || c.days.includes(wd)))
      .map((c) => ({ id: c.id, title: c.title, done: doneToday.has(c.id) }));
    if (items.length) out.push({ personId: p.id, name: p.name, color: p.color, items, allDone: items.every((i) => i.done) });
  }
  return out;
}
