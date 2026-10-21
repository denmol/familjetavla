import { describe, expect, it } from "vitest";
import type { HaEntityInfo } from "./discovery.js";
import type { HaState } from "./connectors/ha.js";
import type { Config, Control } from "./types.js";
import { brandOf, buildVacuums, calibrate, fanLabel, opCall, phaseOf, placeRooms, rawRooms, roomCalls } from "./vacuum.js";

// What Roborock Custom Map gives for a real home: rooms in the robot's coordinates and three calibration points.
const CALIBRATION = [
  { vacuum: { x: 25500, y: 25500 }, map: { x: 700, y: 612 } },
  { vacuum: { x: 35500, y: 25500 }, map: { x: 1500, y: 612 } },
  { vacuum: { x: 25500, y: 35500 }, map: { x: 700, y: -188 } },
];
const MAP_ATTRS = {
  calibration_points: CALIBRATION,
  rooms: {
    "1": { x0: 26450, y0: 22550, x1: 26900, y1: 25000, number: 1, name: "Unknown" },
    "16": { x0: 26950, y0: 22350, x1: 29800, y1: 25100, number: 16, name: "Köket" },
    "17": { x0: 20450, y0: 23600, x1: 26250, y1: 28150, number: 17, name: "Hallen" },
  },
};

describe("vacuum: map and rooms", () => {
  it("calibrates the robot's coordinates onto the map image (flipped y, 0.08 px per unit)", () => {
    const to = calibrate(CALIBRATION)!;
    expect(to({ x: 25500, y: 25500 })).toEqual({ x: 700, y: 612 });
    const p = to({ x: 30500, y: 30500 });
    expect(p.x).toBeCloseTo(1100);
    expect(p.y).toBeCloseTo(212);
  });

  it("refuses a calibration that cannot be solved", () => {
    expect(calibrate(undefined)).toBeNull();
    expect(calibrate([CALIBRATION[0], CALIBRATION[0], CALIBRATION[0]])).toBeNull();
  });

  it("lists named rooms (not Unknown) and places them in image pixels", () => {
    const rooms = placeRooms(rawRooms(MAP_ATTRS, {}), MAP_ATTRS.calibration_points);
    expect(rooms.map((r) => r.name)).toEqual(["Köket", "Hallen"]);
    const kok = rooms[0].box!;
    expect(kok.x).toBeCloseTo(700 + (26950 - 25500) * 0.08);
    expect(kok.w).toBeCloseTo((29800 - 26950) * 0.08);
    expect(kok.h).toBeCloseTo((25100 - 22350) * 0.08);
    expect(kok.y).toBeCloseTo(612 - (25100 - 25500) * 0.08); // y is flipped: the top edge on the image is the robot's larger y
  });

  it("reads rooms off the vacuum when the map has none (Dreame style) – without a box", () => {
    const rooms = placeRooms(rawRooms(undefined, { rooms: { "Hem": [{ id: 3, name: "Sovrum" }, { id: 4, name: "Kök" }] } }), undefined);
    expect(rooms).toEqual([{ id: "3", name: "Sovrum" }, { id: "4", name: "Kök" }]);
  });
});

describe("vacuum: commands", () => {
  const rooms = rawRooms(MAP_ATTRS, {});
  it("Roborock: segment clean first, then zoned cleaning over the room rectangles", () => {
    const calls = roomCalls("roborock", "vacuum.foppa", rooms, ["16", "17"], 2);
    expect(calls[0]).toEqual({ domain: "vacuum", service: "send_command", data: { entity_id: "vacuum.foppa", command: "app_segment_clean", params: [{ segments: [16, 17], repeat: 2 }] } });
    expect(calls[1]).toMatchObject({ domain: "roborock", service: "set_vacuum_zoned_cleaning" });
    expect((calls[1].data.zone as number[][])[0]).toEqual([26950, 22350, 29800, 25100, 2]);
  });
  it("Dreame uses its own segment service; an unknown brand has no room cleaning", () => {
    expect(roomCalls("dreame", "vacuum.x", [{ id: "3", name: "Sovrum" }], ["3"])[0]).toMatchObject({ domain: "dreame_vacuum", service: "vacuum_clean_segment", data: { segments: [3] } });
    expect(roomCalls(undefined, "vacuum.x", rooms, ["16"])).toEqual([]);
    expect(roomCalls("roborock", "vacuum.x", rooms, ["999"])).toEqual([]);
  });
  it("maps the buttons to Home Assistant's vacuum services", () => {
    expect(opCall("home", "vacuum.a")).toEqual({ domain: "vacuum", service: "return_to_base", data: { entity_id: "vacuum.a" } });
    expect(opCall("fan", "vacuum.a", "turbo").data).toEqual({ entity_id: "vacuum.a", fan_speed: "turbo" });
  });
  it("names brands, phases and fan speeds", () => {
    expect(brandOf("Roborock S7")).toBe("roborock");
    expect(brandOf("Dreame L10")).toBe("dreame");
    expect(brandOf("iRobot Roomba")).toBeUndefined();
    expect(phaseOf("docked")).toBe("docked");
    expect(phaseOf("unavailable")).toBe("offline");
    expect(fanLabel("max_plus")).toBe("Max+");
    expect(fanLabel("whisper")).toBe("Whisper");
  });
});

describe("vacuum: the card", () => {
  const st = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): [string, HaState] => [entity_id, { entity_id, state, attributes, last_changed: "" }];
  const states = new Map<string, HaState>([
    st("vacuum.foppa", "docked", { fan_speed: "max_plus", fan_speed_list: ["quiet", "turbo", "max_plus"], supported_features: 30524 }),
    st("image.foppa_karta", "2026-10-21T17:28:41+00:00", MAP_ATTRS),
    st("sensor.foppa_batteri", "100", { unit_of_measurement: "%" }),
    st("sensor.foppa_nuvarande_rum", "Hallen"),
    st("sensor.foppa_fel", "none"),
    st("sensor.foppa_filtertid_kvar", "123.97", { unit_of_measurement: "h", friendly_name: "Foppa Filtertid kvar" }),
    st("select.foppa_mopplage", "standard", { options: ["standard", "deep"], friendly_name: "Foppa Moppläge" }),
  ]);
  const cfg = {
    entities: { vacuums: [{ name: "Foppa", entityId: "vacuum.foppa", brand: "roborock", map: "image.foppa_karta", battery: "sensor.foppa_batteri", room: "sensor.foppa_nuvarande_rum", error: "sensor.foppa_fel", sensors: ["sensor.foppa_filtertid_kvar"], controls: ["select.foppa_mopplage"] }] },
  } as unknown as Config;
  const control = (id: string): Control => ({ entityId: id, name: id, domain: id.split(".")[0], state: states.get(id)?.state ?? "", on: false, offline: false });

  it("shows state, battery, fan speeds, rooms, consumables and settings", () => {
    const [v] = buildVacuums(cfg, states, control);
    expect(v).toMatchObject({ phase: "docked", label: "Laddar", battery: 100, charging: true, fanSpeed: "max_plus", canRooms: true, mapVersion: "2026-10-21T17:28:41+00:00", room: "Hallen" });
    expect(v.fanSpeeds.map((f) => f.label)).toEqual(["Tyst", "Turbo", "Max+"]);
    expect(v.rooms.map((r) => r.name)).toEqual(["Köket", "Hallen"]);
    expect(v.rows).toEqual([{ name: "Filtertid kvar", value: "124 h", ok: true }]);
    expect(v.controls).toHaveLength(1);
    expect(v.error).toBeUndefined();
    expect(v.can).toMatchObject({ start: true, pause: true, stop: true, home: true, locate: true, spot: true });
  });

  it("says where it is while cleaning and flags an error", () => {
    states.set("vacuum.foppa", { ...states.get("vacuum.foppa")!, state: "cleaning" });
    expect(buildVacuums(cfg, states, control)[0].label).toBe("Städar · Hallen");
    states.set("sensor.foppa_fel", { ...states.get("sensor.foppa_fel")!, state: "dust_bin_missing" });
    expect(buildVacuums(cfg, states, control)[0].error).toBe("dust bin missing");
  });
});

describe("vacuum: discovery", () => {
  const e = (x: Partial<HaEntityInfo> & { e: string; n: string }): HaEntityInfo => ({ a: null, d: null, dn: null, m: null, mo: null, dc: null, u: null, st: "1", lu: new Date().toISOString(), ...x });
  it("finds a Roborock with a map that sits on another device, tied by name", async () => {
    const { discover } = await import("./discovery.js");
    const all = [
      e({ e: "vacuum.foppa", n: "Foppa", d: "rr", dn: "Foppa", m: "Roborock", mo: "Roborock S8", st: "docked" }),
      e({ e: "sensor.foppa_batteri", n: "Foppa Batteri", d: "rr", dn: "Foppa", m: "Roborock", dc: "battery", u: "%", st: "100" }),
      e({ e: "sensor.foppa_nuvarande_rum", n: "Foppa Nuvarande rum", d: "rr", dn: "Foppa", m: "Roborock", st: "Hallen" }),
      e({ e: "sensor.foppa_filtertid_kvar", n: "Foppa Filtertid kvar", d: "rr", dn: "Foppa", m: "Roborock", dc: "duration", u: "h", st: "124" }),
      e({ e: "select.foppa_mopplage", n: "Foppa Moppläge", d: "rr", dn: "Foppa", m: "Roborock", st: "standard" }),
      e({ e: "switch.foppa_stor_inte", n: "Foppa Stör inte", d: "rr", dn: "Foppa", m: "Roborock", st: "off" }),
      e({ e: "image.foppa_hemmet_custom", n: "Foppa Hemmet_custom", d: "map" }),
    ];
    const d = discover(all);
    expect(d.cars).toHaveLength(0);
    expect(d.vacuums).toHaveLength(1);
    expect(d.vacuums[0]).toMatchObject({ name: "Foppa", entityId: "vacuum.foppa", brand: "roborock", map: "image.foppa_hemmet_custom", battery: "sensor.foppa_batteri", room: "sensor.foppa_nuvarande_rum", sensors: ["sensor.foppa_filtertid_kvar"], controls: ["select.foppa_mopplage", "switch.foppa_stor_inte"] });
  });
  it("takes any other brand too, just without room cleaning", async () => {
    const { discover } = await import("./discovery.js");
    const d = discover([e({ e: "vacuum.roomba", n: "Roomba", d: "r", dn: "Roomba", m: "iRobot", st: "docked" })]);
    expect(d.vacuums[0]).toMatchObject({ name: "Roomba", entityId: "vacuum.roomba" });
    expect(d.vacuums[0].brand).toBeUndefined();
  });
});
