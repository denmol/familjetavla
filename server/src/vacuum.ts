import type { HaState } from "./connectors/ha.js";
import type { Config, Control, DashVacuum, VacuumEntity, VacuumPhase, VacuumRoom } from "./types.js";

/**
 * Robotdammsugare. Allt går via Home Assistants vacuum-tjänster, så vilket märke som helst får
 * start, paus, hem, hitta och fläkthastighet. Kartan är en image.* eller camera.* i Home Assistant.
 * Bara rumsstädning är märkesspecifik: den finns för Roborock/Xiaomi och Dreame.
 */

type Attrs = Record<string, unknown>;

const FEATURE = { pause: 4, stop: 8, home: 16, fan: 32, locate: 512, spot: 1024, start: 8192 } as const;

const LABEL: Record<VacuumPhase, string> = {
  cleaning: "Städar",
  returning: "På väg hem",
  docked: "Laddar",
  paused: "Pausad",
  idle: "Redo",
  error: "Fel",
  offline: "Offline",
};

export function phaseOf(state: string | undefined): VacuumPhase {
  switch (state) {
    case "cleaning":
      return "cleaning";
    case "returning":
      return "returning";
    case "docked":
      return "docked";
    case "paused":
      return "paused";
    case "idle":
      return "idle";
    case "error":
      return "error";
    default:
      return "offline";
  }
}

const FAN_LABELS: Record<string, string> = {
  off: "Av",
  quiet: "Tyst",
  silent: "Tyst",
  gentle: "Tyst",
  balanced: "Balanserad",
  standard: "Normal",
  normal: "Normal",
  medium: "Normal",
  turbo: "Turbo",
  strong: "Kraftig",
  high: "Hög",
  max: "Max",
  max_plus: "Max+",
  custom: "Anpassad",
  auto: "Auto",
};

/** "max_plus" → "Max+", an unknown speed is shown as the integration names it. */
export const fanLabel = (v: string) => FAN_LABELS[v.toLowerCase()] ?? (v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " "));

/** Roborock/Xiaomi and Dreame share their brand's room commands. */
export function brandOf(text: string): VacuumEntity["brand"] | undefined {
  if (/roborock|rockrobo|xiaomi|mijia|mi robot/i.test(text)) return "roborock";
  if (/dreame|mova/i.test(text)) return "dreame";
  return undefined;
}

// ---------- Rooms and map ----------

interface RawRoom {
  id: string;
  name: string;
  /** Rectangle in the robot's own coordinates: x0, y0, x1, y1. */
  vac?: [number, number, number, number];
}

type Point = { x: number; y: number };
type Calibration = { vacuum: Point; map: Point };

/**
 * Map calibration is three points that each say where a robot coordinate lands on the image.
 * Three points fix a flat transform (scale, rotation, flip, offset): solved here without a library.
 */
export function calibrate(points: unknown): ((p: Point) => Point) | null {
  if (!Array.isArray(points) || points.length < 3) return null;
  const c = points.slice(0, 3) as Calibration[];
  const ok = c.every((p) => [p?.vacuum?.x, p?.vacuum?.y, p?.map?.x, p?.map?.y].every((n) => typeof n === "number" && Number.isFinite(n)));
  if (!ok) return null;
  const [a, b, d] = c;
  const v1 = { x: b.vacuum.x - a.vacuum.x, y: b.vacuum.y - a.vacuum.y };
  const v2 = { x: d.vacuum.x - a.vacuum.x, y: d.vacuum.y - a.vacuum.y };
  const m1 = { x: b.map.x - a.map.x, y: b.map.y - a.map.y };
  const m2 = { x: d.map.x - a.map.x, y: d.map.y - a.map.y };
  const det = v1.x * v2.y - v2.x * v1.y;
  if (Math.abs(det) < 1e-9) return null;
  // M = [m1 m2] · inverse([v1 v2])
  const inv = { a: v2.y / det, b: -v2.x / det, c: -v1.y / det, d: v1.x / det };
  const M = {
    a: m1.x * inv.a + m2.x * inv.c,
    b: m1.x * inv.b + m2.x * inv.d,
    c: m1.y * inv.a + m2.y * inv.c,
    d: m1.y * inv.b + m2.y * inv.d,
  };
  return (p) => {
    const dx = p.x - a.vacuum.x;
    const dy = p.y - a.vacuum.y;
    return { x: a.map.x + M.a * dx + M.b * dy, y: a.map.y + M.c * dx + M.d * dy };
  };
}

const named = (n: unknown) => typeof n === "string" && n.trim() !== "" && !/^unknown$/i.test(n.trim());

/**
 * The rooms the integration knows. Roborock Custom Map puts them on the map image
 * (rooms: { "16": { name, x0, y0, x1, y1 } }); Dreame and others list them on the vacuum
 * (rooms: { "Map": [{ id, name }] } or [{ id, name }]).
 */
export function rawRooms(mapAttrs: Attrs | undefined, vacAttrs: Attrs | undefined): RawRoom[] {
  const out: RawRoom[] = [];
  const fromMap = mapAttrs?.rooms;
  if (fromMap && typeof fromMap === "object" && !Array.isArray(fromMap)) {
    for (const [key, r] of Object.entries(fromMap as Record<string, Attrs>)) {
      if (!r || !named(r.name)) continue;
      const box = [r.x0, r.y0, r.x1, r.y1];
      out.push({ id: String(r.number ?? key), name: String(r.name), vac: box.every((n) => typeof n === "number") ? (box as RawRoom["vac"]) : undefined });
    }
  }
  if (!out.length) {
    const fromVac = vacAttrs?.rooms;
    const lists = Array.isArray(fromVac) ? [fromVac] : fromVac && typeof fromVac === "object" ? Object.values(fromVac as Record<string, unknown>).filter(Array.isArray) : [];
    for (const list of lists as Attrs[][]) {
      for (const r of list) if (r && named(r.name) && r.id !== undefined) out.push({ id: String(r.id), name: String(r.name) });
      if (out.length) break; // the first map
    }
  }
  return out;
}

/** Rooms with their rectangle in image pixels (only when the map can be calibrated). */
export function placeRooms(rooms: RawRoom[], calibration: unknown): VacuumRoom[] {
  const to = calibrate(calibration);
  return rooms.map((r) => {
    if (!to || !r.vac) return { id: r.id, name: r.name };
    const a = to({ x: r.vac[0], y: r.vac[1] });
    const b = to({ x: r.vac[2], y: r.vac[3] });
    return { id: r.id, name: r.name, box: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) } };
  });
}

export interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

/**
 * Clean these rooms. Tried in order until one is accepted: the brand's own segment command first,
 * for Roborock then its zoned cleaning over the rooms' rectangles (which Home Assistant's own
 * Roborock integration always has).
 */
export function roomCalls(brand: VacuumEntity["brand"] | undefined, entityId: string, rooms: RawRoom[], ids: string[], repeat = 1): ServiceCall[] {
  const picked = rooms.filter((r) => ids.includes(r.id));
  if (!picked.length) return [];
  const segments = picked.map((r) => Number(r.id));
  if (brand === "roborock") {
    const calls: ServiceCall[] = [{ domain: "vacuum", service: "send_command", data: { entity_id: entityId, command: "app_segment_clean", params: [{ segments, repeat }] } }];
    const zones = picked.filter((r) => r.vac).map((r) => [...r.vac!, repeat]);
    if (zones.length === picked.length) calls.push({ domain: "roborock", service: "set_vacuum_zoned_cleaning", data: { entity_id: entityId, zone: zones } });
    return calls;
  }
  if (brand === "dreame") return [{ domain: "dreame_vacuum", service: "vacuum_clean_segment", data: { entity_id: entityId, segments, repeats: repeat } }];
  return [];
}

export type VacuumOp = "start" | "pause" | "stop" | "home" | "locate" | "spot" | "fan";

export function opCall(op: VacuumOp, entityId: string, value?: string): ServiceCall {
  const data: Record<string, unknown> = { entity_id: entityId };
  if (op === "fan") return { domain: "vacuum", service: "set_fan_speed", data: { ...data, fan_speed: value } };
  const service = { start: "start", pause: "pause", stop: "stop", home: "return_to_base", locate: "locate", spot: "clean_spot" }[op];
  return { domain: "vacuum", service, data };
}

// ---------- The card on the board ----------

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function formatSensor(st: HaState | undefined): { value: string; ok: boolean } {
  if (!st || st.state === "unavailable" || st.state === "unknown") return { value: "–", ok: false };
  const unit = typeof st.attributes.unit_of_measurement === "string" ? st.attributes.unit_of_measurement : "";
  if (st.attributes.device_class === "timestamp" && /^\d{4}-\d{2}-\d{2}T/.test(st.state)) {
    const d = new Date(st.state);
    if (!Number.isNaN(d.getTime())) return { value: d.toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: process.env.TZ || "Europe/Stockholm" }), ok: true };
  }
  const n = Number(st.state);
  if (Number.isFinite(n) && st.state.trim() !== "") {
    const r = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
    return { value: `${String(r).replace(".", ",")}${unit ? ` ${unit}` : ""}`, ok: true };
  }
  return { value: st.state.replace(/_/g, " "), ok: true };
}

/** "Foppa Filtertid kvar" → "Filtertid kvar" */
const withoutPrefix = (name: string, prefix: string) => (name.toLowerCase().startsWith(prefix.toLowerCase() + " ") ? name.slice(prefix.length + 1) : name);

export function buildVacuums(cfg: Config, states: Map<string, HaState>, control: (id: string, prefix: string) => Control): DashVacuum[] {
  return (cfg.entities.vacuums ?? []).map((v, index) => {
    const st = states.get(v.entityId);
    const a = (st?.attributes ?? {}) as Attrs;
    const features = num(a.supported_features) ?? 0;
    const has = (bit: number) => (features & bit) !== 0;
    const phase = phaseOf(st?.state);
    const batterySt = v.battery ? states.get(v.battery) : undefined;
    const battery = num(Number(batterySt?.state)) ?? num(a.battery_level);
    const roomSt = v.room ? states.get(v.room) : undefined;
    const room = roomSt && !["unavailable", "unknown", "none"].includes(roomSt.state) ? roomSt.state : undefined;
    const errSt = v.error ? states.get(v.error) : undefined;
    const error = phase === "error" || (errSt && !["none", "no_error", "unavailable", "unknown", "ok"].includes(errSt.state.toLowerCase())) ? (errSt?.state && !["none", "unavailable", "unknown"].includes(errSt.state) ? errSt.state.replace(/_/g, " ") : "Dammsugaren behöver hjälp") : undefined;
    const mapSt = v.map ? states.get(v.map) : undefined;
    const rooms = placeRooms(rawRooms(mapSt?.attributes, a), mapSt?.attributes?.calibration_points);
    const list = Array.isArray(a.fan_speed_list) ? (a.fan_speed_list as unknown[]).map(String) : [];
    return {
      index,
      name: v.name,
      entityId: v.entityId,
      phase,
      label: phase === "cleaning" && room ? `${LABEL.cleaning} · ${room}` : LABEL[phase],
      battery: battery === null ? null : Math.round(battery),
      charging: phase === "docked",
      fanSpeed: typeof a.fan_speed === "string" ? a.fan_speed : undefined,
      fanSpeeds: has(FEATURE.fan) || list.length ? list.map((value) => ({ value, label: fanLabel(value) })) : [],
      room,
      error,
      mapVersion: mapSt && mapSt.state !== "unavailable" ? mapSt.state : undefined,
      rooms,
      canRooms: rooms.length > 0 && roomCalls(v.brand, v.entityId, rawRooms(mapSt?.attributes, a), rooms.map((r) => r.id)).length > 0,
      can: {
        start: has(FEATURE.start) || !features,
        pause: has(FEATURE.pause),
        stop: has(FEATURE.stop),
        home: has(FEATURE.home),
        locate: has(FEATURE.locate),
        spot: has(FEATURE.spot),
      },
      rows: (v.sensors ?? []).map((id) => ({ name: withoutPrefix(String(states.get(id)?.attributes.friendly_name ?? id), v.name), ...formatSensor(states.get(id)) })),
      controls: (v.controls ?? []).map((id) => control(id, v.name)),
    };
  });
}

/** The rooms of a configured vacuum as the board last saw them, for the cleaning commands. */
export function roomsOf(v: VacuumEntity, states: Map<string, HaState>): RawRoom[] {
  return rawRooms(v.map ? states.get(v.map)?.attributes : undefined, states.get(v.entityId)?.attributes);
}
