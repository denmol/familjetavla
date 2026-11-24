import type { HaState } from "./connectors/ha.js";
import type { ApplianceEntities, ApplianceView, Config } from "./types.js";

/**
 * Husgeråd: washing machine, dryer, dishwasher, oven … from any brand. Integrations name their
 * states differently (Miele "in_use", Home Connect "run", SmartThings "run", LG "running"), so the
 * board reads them by meaning; a plain machine behind a power plug counts as running above a few watts.
 */

export type Phase = "running" | "paused" | "done" | "idle" | "error" | "offline";

const PHASES: [Phase, RegExp][] = [
  ["error", /error|failure|fault|fel\b|alarm|action_?required/i],
  ["done", /finish|ended|end\b|complete|done|klar|färdig/i],
  ["paused", /pause|paus/i],
  // Last word counts too: Home Connect's old "BSH.Common.EnumType.OperationState.Ready".
  ["idle", /(^|[._ ])(off|inactive|ready|idle|stop|stopped|standby|none|av|program_?selected|waiting_?to_?start|delayed_?start|delayedstart|programmed|on)$/i],
  ["running", /run|in_?use|wash|rins|spin|dry|cool|heat|drain|clean|soak|steam|main|pre|tvätt|torkar|diskar|centrifug/i],
];

/** One machine's state, by meaning – whatever words its integration uses. */
export function phaseOf(status: string | undefined, watts: number | undefined): Phase {
  if (status && status !== "unknown" && status !== "unavailable") {
    for (const [p, re] of PHASES) if (re.test(status)) return p;
  }
  if (watts !== undefined) return watts > 4 ? "running" : "idle";
  return status === "unavailable" ? "offline" : "idle";
}

const VERB: Record<ApplianceEntities["kind"], string> = {
  washer: "Tvättar",
  dryer: "Torkar",
  dishwasher: "Diskar",
  oven: "Är på",
  other: "Går",
};

const num = (s?: HaState) => (s && Number.isFinite(Number(s.state)) ? Number(s.state) : undefined);

/** Minutes left: a duration in minutes/hours/seconds, or a timestamp when it will be ready. */
export function minutesLeft(s: HaState | undefined, now: Date): number | undefined {
  if (!s || s.state === "unknown" || s.state === "unavailable") return undefined;
  const unit = String(s.attributes.unit_of_measurement ?? "");
  const n = Number(s.state);
  if (Number.isFinite(n)) {
    if (unit === "h") return Math.round(n * 60);
    if (unit === "s") return Math.round(n / 60);
    if (unit === "min" || unit === "") return Math.round(n);
    return undefined;
  }
  const t = Date.parse(s.state);
  if (Number.isFinite(t)) return Math.max(0, Math.round((t - now.getTime()) / 60_000));
  // "1:25" or "01:25:00" (some integrations show hours:minutes).
  const m = s.state.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function buildAppliances(cfg: Config, states: Map<string, HaState>, now = new Date()): ApplianceView[] | undefined {
  const list = cfg.entities.appliances ?? [];
  if (!list.length) return undefined;
  return list.map((a) => {
    const st = a.status ? states.get(a.status) : undefined;
    const watts = a.power ? num(states.get(a.power)) : undefined;
    const phase: Phase = a.status && (!st || st.state === "unavailable") && watts === undefined ? "offline" : phaseOf(st?.state, watts);
    const left = phase === "running" || phase === "paused" ? minutesLeft(a.remaining ? states.get(a.remaining) : undefined, now) : undefined;
    const progress = a.progress ? num(states.get(a.progress)) : undefined;
    const ends = left !== undefined && left > 0 ? hhmm(new Date(now.getTime() + left * 60_000)) : undefined;
    const label =
      phase === "running"
        ? `${VERB[a.kind]}${left ? ` – ${left >= 60 ? `${Math.floor(left / 60)} h ${left % 60} min` : `${left} min`} kvar` : ""}`
        : phase === "paused"
          ? "Pausad"
          : phase === "done"
            ? "Klar"
            : phase === "error"
              ? "Fel – titta på maskinen"
              : phase === "offline"
                ? "Svarar inte"
                : "Av";
    return { name: a.name, kind: a.kind, phase, label, minutesLeft: left, endsAt: ends, progress: progress !== undefined ? Math.round(progress) : undefined };
  });
}
