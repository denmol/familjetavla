import type { HaState } from "./connectors/ha.js";
import type { AlarmMode, Config, LockState, Robot, Security } from "./types.js";

/**
 * Säkerhet and Städ, for every brand Home Assistant knows: the board only reads Home Assistant's
 * own entity types (camera, lock, alarm_control_panel, cover, binary_sensor, vacuum, lawn_mower)
 * and the features each entity says it has – never a brand's own attributes.
 */

const gone = (s?: HaState) => !s || s.state === "unavailable" || s.state === "unknown";
const features = (s?: HaState) => Number((s?.attributes as { supported_features?: number } | undefined)?.supported_features ?? 0);
const attr = <T>(s: HaState | undefined, k: string) => (s?.attributes as Record<string, unknown> | undefined)?.[k] as T | undefined;

const LOCK_STATES: LockState[] = ["locked", "unlocked", "locking", "unlocking", "jammed", "open", "opening"];

const ALARM_LABEL: Record<string, string> = {
  disarmed: "Av",
  armed_home: "På – hemma",
  armed_away: "På – borta",
  armed_night: "På – natt",
  armed_vacation: "På – semester",
  armed_custom_bypass: "På",
  arming: "Slås på …",
  disarming: "Slås av …",
  pending: "Väntar …",
  triggered: "LARMAR",
};

const COVER_LABEL: Record<string, string> = { open: "Öppen", closed: "Stängd", opening: "Öppnas …", closing: "Stängs …" };

export function buildSecurity(cfg: Config, states: Map<string, HaState>): Security | undefined {
  const sec = cfg.entities.security;
  if (!sec) return undefined;
  const count = sec.cameras.length + sec.locks.length + sec.alarms.length + sec.covers.length + sec.openings.length;
  if (!count) return undefined;
  return {
    cameras: sec.cameras.map((c) => ({ entityId: c.entityId, name: c.name, offline: gone(states.get(c.entityId)) })),
    locks: sec.locks.map((l) => {
      const s = states.get(l.entityId);
      const state = LOCK_STATES.find((x) => x === s?.state) ?? "unknown";
      return { entityId: l.entityId, name: l.name, state, offline: gone(s), needsCode: attr(s, "code_format") != null, canOpen: Boolean(features(s) & 1) };
    }),
    alarms: sec.alarms.map((a) => {
      const s = states.get(a.entityId);
      const f = features(s);
      const modes: AlarmMode[] = [];
      if (f & 1) modes.push("home");
      if (f & 2) modes.push("away");
      if (f & 4) modes.push("night");
      if (f & 32) modes.push("vacation");
      // Panels that list no features (old integrations) still arm away.
      if (!modes.length) modes.push("away");
      const state = s?.state ?? "unknown";
      return {
        entityId: a.entityId,
        name: a.name,
        state,
        label: gone(s) ? "Svarar inte" : (ALARM_LABEL[state] ?? state),
        armed: state.startsWith("armed_"),
        triggered: state === "triggered",
        offline: gone(s),
        modes,
        needsCode: attr(s, "code_format") != null,
      };
    }),
    covers: sec.covers.map((c) => {
      const s = states.get(c.entityId);
      const state = s?.state ?? "unknown";
      return { entityId: c.entityId, name: c.name, state, label: gone(s) ? "Svarar inte" : (COVER_LABEL[state] ?? state), open: state === "open" || state === "opening", offline: gone(s) };
    }),
    openings: sec.openings.map((o) => {
      const s = states.get(o.entityId);
      return { entityId: o.entityId, name: o.name, open: s?.state === "on", offline: gone(s) };
    }),
    allowUnlock: Boolean(sec.allowUnlock),
  };
}

// ---------- Städ ----------

const ROBOT_LABEL: Record<string, string> = {
  cleaning: "Städar",
  mowing: "Klipper",
  docked: "I laddstationen",
  charging: "Laddar",
  idle: "Väntar",
  paused: "Pausad",
  returning: "Åker hem",
  error: "Har fastnat",
  on: "Städar",
  off: "Av",
};
const BUSY = new Set(["cleaning", "mowing", "returning", "on"]);

export function buildRobots(cfg: Config, states: Map<string, HaState>): Robot[] | undefined {
  const list = cfg.entities.robots ?? [];
  if (!list.length) return undefined;
  return list.map((r) => {
    const s = states.get(r.entityId);
    const kind = r.entityId.startsWith("lawn_mower.") ? "mower" : "vacuum";
    const f = features(s);
    const state = s?.state ?? "unknown";
    // The battery is an attribute on older vacuums and its own sensor on newer ones (and on mowers).
    const fromAttr = attr<number>(s, "battery_level");
    const sensor = r.battery ? states.get(r.battery) : undefined;
    const fromSensor = sensor && !gone(sensor) ? Number(sensor.state) : undefined;
    const battery = typeof fromAttr === "number" ? fromAttr : Number.isFinite(fromSensor) ? fromSensor : undefined;
    const status = attr<string>(s, "status");
    const error = state === "error";
    return {
      entityId: r.entityId,
      name: r.name,
      kind,
      state,
      label: gone(s) ? "Svarar inte" : error && status ? `Har fastnat: ${status}` : (ROBOT_LABEL[state] ?? state),
      busy: BUSY.has(state),
      error,
      offline: gone(s),
      battery: battery !== undefined ? Math.round(battery) : undefined,
      // Vacuum: START 8192 (TURN_ON 1 on old ones), PAUSE 4, RETURN_HOME 16. Mower: START_MOWING 1, PAUSE 2, DOCK 4.
      canStart: kind === "mower" ? Boolean(f & 1) : Boolean(f & 8192 || f & 1),
      canPause: kind === "mower" ? Boolean(f & 2) : Boolean(f & 4),
      canDock: kind === "mower" ? Boolean(f & 4) : Boolean(f & 16),
    };
  });
}

/** The service call behind Starta, Paus and Hem. */
export function robotCall(entityId: string, op: "start" | "pause" | "dock", f: number) {
  if (entityId.startsWith("lawn_mower.")) return { domain: "lawn_mower", service: op === "start" ? "start_mowing" : op === "pause" ? "pause" : "dock" };
  if (op === "start") return { domain: "vacuum", service: f & 8192 ? "start" : "turn_on" };
  return { domain: "vacuum", service: op === "pause" ? "pause" : "return_to_base" };
}

/** The service call behind the alarm buttons. */
export function alarmCall(mode: AlarmMode | "off") {
  return { domain: "alarm_control_panel", service: mode === "off" ? "alarm_disarm" : `alarm_arm_${mode}` };
}
