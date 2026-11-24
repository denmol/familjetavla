import type { HaState } from "./connectors/ha.js";
import { buildAppliances } from "./appliances.js";
import { buildRobots, buildSecurity } from "./security.js";
import type { Config, Person } from "./types.js";

/**
 * Hemmet tells the right person even when nobody looks at the board: the washing is done, the
 * robot is stuck, the front door is unlocked at night, the garage door has been open a long time,
 * the alarm goes off. Messages go to the adults who are at home (Home Assistant's person.*), or to
 * every adult with a phone when nobody's location is known.
 */

export interface HomeAlert {
  key: string;
  title: string;
  message: string;
  /** "home": the adults at home (all if unknown). "all": every adult, e.g. the alarm. */
  to: "home" | "all";
}

export interface HomeMemory {
  machines: Map<string, { phase: string; since: number }>;
  robots: Map<string, boolean>;
  coversOpen: Map<string, number>;
}

export const newHomeMemory = (): HomeMemory => ({ machines: new Map(), robots: new Map(), coversOpen: new Map() });

const DONE: Record<string, string> = { washer: "Tvätten är klar", dryer: "Torktumlaren är klar", dishwasher: "Disken är klar", oven: "Ugnen är klar", other: "Klart" };
const day = (d: Date) => d.toDateString();
const hm = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** What has happened since the last look (every 20 s). Pure: the memory is passed in and updated. */
export function homeAlerts(cfg: Config, states: Map<string, HaState>, mem: HomeMemory, now: Date): HomeAlert[] {
  const out: HomeAlert[] = [];
  const t = now.getTime();

  for (const m of buildAppliances(cfg, states, now) ?? []) {
    const prev = mem.machines.get(m.name);
    const phase = m.phase === "paused" ? "running" : m.phase;
    if (!prev || prev.phase !== phase) mem.machines.set(m.name, { phase, since: t });
    // Done: the machine says so, or a plug-only machine went quiet after a real run (10 min+).
    const ranLong = prev?.phase === "running" && t - prev.since > 10 * 60_000;
    if (prev?.phase === "running" && (phase === "done" || (phase === "idle" && ranLong))) {
      out.push({ key: `machine:${m.name}:${t}`, title: DONE[m.kind] ?? "Klart", message: `${m.name} är klar.`, to: "home" });
    }
    if (prev && prev.phase !== "error" && phase === "error") out.push({ key: `machine-err:${m.name}:${t}`, title: `${m.name}: fel`, message: `${m.name} har stannat med ett fel – titta på maskinen.`, to: "home" });
  }

  for (const r of buildRobots(cfg, states) ?? []) {
    const was = mem.robots.get(r.entityId);
    mem.robots.set(r.entityId, r.error);
    if (was === false && r.error) out.push({ key: `robot:${r.entityId}:${t}`, title: `${r.name} har fastnat`, message: r.label, to: "home" });
  }

  const sec = buildSecurity(cfg, states);
  if (sec) {
    // 22:00 every evening: an unlocked door, once per lock and evening.
    if (hm(now) >= 22 * 60 && hm(now) < 22 * 60 + 2) {
      for (const l of sec.locks.filter((x) => x.state === "unlocked" || x.state === "open")) {
        out.push({ key: `lock:${l.entityId}:${day(now)}`, title: `${l.name} är olåst`, message: `${l.name} är fortfarande olåst kl 22.`, to: "home" });
      }
    }
    for (const c of sec.covers) {
      if (!c.open) {
        mem.coversOpen.delete(c.entityId);
        continue;
      }
      const since = mem.coversOpen.get(c.entityId) ?? t;
      mem.coversOpen.set(c.entityId, since);
      if (t - since >= 30 * 60_000) out.push({ key: `cover:${c.entityId}:${since}`, title: `${c.name} är öppen`, message: `${c.name} har stått öppen i en halvtimme.`, to: "home" });
    }
    for (const a of sec.alarms.filter((x) => x.triggered)) out.push({ key: `alarm:${a.entityId}:${day(now)}:${Math.floor(t / 600_000)}`, title: `${a.name} larmar!`, message: `${a.name} har gått – kontrollera hemmet.`, to: "all" });
  }
  return out;
}

/** The adults who get a home alert: those at home by Home Assistant's person.*, else all with a phone. */
export function alertReceivers(adults: Person[], states: Map<string, HaState>, to: HomeAlert["to"]): Person[] {
  const withPhone = adults.filter((a) => a.notify?.service && a.notify.home !== false);
  if (to === "all") return withPhone;
  const persons = [...states.values()].filter((s) => s.entity_id.startsWith("person."));
  const first = (n: string) => n.trim().toLowerCase().split(/\s+/)[0] ?? "";
  const atHome = withPhone.filter((a) => persons.some((p) => first(String(p.attributes.friendly_name ?? "")) === first(a.name) && p.state === "home"));
  return atHome.length ? atHome : withPhone;
}
