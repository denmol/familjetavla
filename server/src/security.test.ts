import { describe, expect, it } from "vitest";
import type { HaState } from "./connectors/ha.js";
import { alarmCall, buildRobots, buildSecurity, robotCall } from "./security.js";
import type { Config } from "./types.js";

const st = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): [string, HaState] => [entity_id, { entity_id, state, attributes } as HaState];
const cfg = (entities: Partial<Config["entities"]>) => ({ entities }) as unknown as Config;

describe("Säkerhet – any brand", () => {
  const security = {
    cameras: [{ name: "Entré", entityId: "camera.reolink_entre" }],
    locks: [
      { name: "Ytterdörren", entityId: "lock.yale" },
      { name: "Förrådet", entityId: "lock.nuki" },
    ],
    alarms: [
      { name: "Verisure", entityId: "alarm_control_panel.verisure" },
      { name: "Gammalt larm", entityId: "alarm_control_panel.old" },
    ],
    covers: [{ name: "Garaget", entityId: "cover.garage" }],
    openings: [
      { name: "Altandörren", entityId: "binary_sensor.altan" },
      { name: "Köksfönstret", entityId: "binary_sensor.kok" },
    ],
  };
  const states = new Map([
    st("camera.reolink_entre", "idle"),
    st("lock.yale", "locked", { code_format: "^\\d{4}$" }),
    st("lock.nuki", "unlocked", { supported_features: 1 }),
    st("alarm_control_panel.verisure", "armed_away", { supported_features: 3, code_format: "number" }),
    st("alarm_control_panel.old", "disarmed"),
    st("cover.garage", "open"),
    st("binary_sensor.altan", "on"),
    st("binary_sensor.kok", "off"),
  ]);
  const s = buildSecurity(cfg({ security }), states)!;

  it("reads locks, with code and 'open' only when the lock says so", () => {
    expect(s.locks).toEqual([
      { entityId: "lock.yale", name: "Ytterdörren", state: "locked", offline: false, needsCode: true, canOpen: false },
      { entityId: "lock.nuki", name: "Förrådet", state: "unlocked", offline: false, needsCode: false, canOpen: true },
    ]);
    expect(s.allowUnlock).toBe(false);
  });

  it("offers the alarm modes the panel has, and away for panels that list none", () => {
    expect(s.alarms[0]).toMatchObject({ label: "På – borta", armed: true, modes: ["home", "away"], needsCode: true });
    expect(s.alarms[1]).toMatchObject({ label: "Av", armed: false, modes: ["away"], needsCode: false });
  });

  it("knows what is open", () => {
    expect(s.covers[0]).toMatchObject({ open: true, label: "Öppen" });
    expect(s.openings.filter((o) => o.open).map((o) => o.name)).toEqual(["Altandörren"]);
  });

  it("is absent with nothing chosen", () => {
    expect(buildSecurity(cfg({}), states)).toBeUndefined();
    expect(buildSecurity(cfg({ security: { cameras: [], locks: [], alarms: [], covers: [], openings: [] } }), states)).toBeUndefined();
  });

  it("calls the alarm service for each mode", () => {
    expect(alarmCall("home")).toEqual({ domain: "alarm_control_panel", service: "alarm_arm_home" });
    expect(alarmCall("off")).toEqual({ domain: "alarm_control_panel", service: "alarm_disarm" });
  });
});

describe("Städ – old and new vacuums, mowers", () => {
  const robots = [
    { name: "Roborock", entityId: "vacuum.roborock", battery: "sensor.roborock_battery" },
    { name: "Gamla Roomba", entityId: "vacuum.roomba" },
    { name: "Automower", entityId: "lawn_mower.automower", battery: "sensor.automower_battery" },
  ];
  const states = new Map([
    st("vacuum.roborock", "error", { supported_features: 8192 | 4 | 16, status: "Hjulet sitter fast" }),
    st("sensor.roborock_battery", "87"),
    st("vacuum.roomba", "cleaning", { supported_features: 1 | 16, battery_level: 54 }),
    st("lawn_mower.automower", "docked", { supported_features: 7 }),
    st("sensor.automower_battery", "100"),
  ]);
  const [rock, roomba, mower] = buildRobots(cfg({ robots }), states)!;

  it("reads battery from the robot or its own sensor", () => {
    expect(rock!.battery).toBe(87);
    expect(roomba!.battery).toBe(54);
    expect(mower!.battery).toBe(100);
  });

  it("says what is wrong in Swedish", () => {
    expect(rock).toMatchObject({ error: true, label: "Har fastnat: Hjulet sitter fast" });
    expect(roomba).toMatchObject({ busy: true, label: "Städar" });
    expect(mower).toMatchObject({ kind: "mower", label: "I laddstationen", canStart: true, canPause: true, canDock: true });
  });

  it("only offers the buttons the robot has", () => {
    expect(roomba).toMatchObject({ canStart: true, canPause: false, canDock: true });
  });

  it("uses the right service for each kind", () => {
    expect(robotCall("vacuum.roborock", "start", 8192)).toEqual({ domain: "vacuum", service: "start" });
    expect(robotCall("vacuum.roomba", "start", 1)).toEqual({ domain: "vacuum", service: "turn_on" });
    expect(robotCall("vacuum.x", "dock", 16)).toEqual({ domain: "vacuum", service: "return_to_base" });
    expect(robotCall("lawn_mower.a", "start", 7)).toEqual({ domain: "lawn_mower", service: "start_mowing" });
    expect(robotCall("lawn_mower.a", "dock", 7)).toEqual({ domain: "lawn_mower", service: "dock" });
  });
});
