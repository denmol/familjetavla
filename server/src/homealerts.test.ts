import { describe, expect, it } from "vitest";
import type { HaState } from "./connectors/ha.js";
import { alertReceivers, homeAlerts, newHomeMemory } from "./homealerts.js";
import type { Config, Person } from "./types.js";

const st = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): [string, HaState] => [entity_id, { entity_id, state, attributes } as HaState];
const cfg = {
  entities: {
    appliances: [
      { name: "Tvättmaskinen", kind: "washer", status: "sensor.wm" },
      { name: "Torktumlaren", kind: "dryer", power: "sensor.plug" },
    ],
    robots: [{ name: "Dammsugaren", entityId: "vacuum.rr" }],
    security: { cameras: [], locks: [{ name: "Ytterdörren", entityId: "lock.door" }], alarms: [{ name: "Larmet", entityId: "alarm_control_panel.a" }], covers: [{ name: "Garageporten", entityId: "cover.g" }], openings: [] },
  },
} as unknown as Config;

describe("Hemmet tells the right person", () => {
  it("says when the washing is done, the robot is stuck and the garage stays open", () => {
    const mem = newHomeMemory();
    const t0 = new Date(2026, 9, 23, 14, 0);
    const at = (min: number) => new Date(t0.getTime() + min * 60_000);
    const s = (wm: string, plug: string, rr: string, cover: string) => new Map([st("sensor.wm", wm), st("sensor.plug", plug), st("vacuum.rr", rr), st("lock.door", "locked"), st("alarm_control_panel.a", "disarmed"), st("cover.g", cover)]);
    expect(homeAlerts(cfg, s("in_use", "1800", "cleaning", "closed"), mem, at(0))).toEqual([]);
    expect(homeAlerts(cfg, s("in_use", "0.5", "error", "open"), mem, at(5)).map((a) => a.title)).toEqual(["Dammsugaren har fastnat"]); // dryer ran only 5 min: no "klar"
    expect(homeAlerts(cfg, s("program_ended", "0.5", "error", "open"), mem, at(20)).map((a) => a.title)).toEqual(["Tvätten är klar"]);
    expect(homeAlerts(cfg, s("off", "1500", "docked", "open"), mem, at(30)).map((a) => a.title)).toEqual([]);
    expect(homeAlerts(cfg, s("off", "1", "docked", "open"), mem, at(50)).map((a) => a.title)).toEqual(["Torktumlaren är klar", "Garageporten är öppen"]);
  });

  it("warns at 22 about an unlocked door and always about the alarm", () => {
    const mem = newHomeMemory();
    const states = new Map([st("sensor.wm", "off"), st("sensor.plug", "0"), st("vacuum.rr", "docked"), st("lock.door", "unlocked"), st("alarm_control_panel.a", "triggered"), st("cover.g", "closed")]);
    const late = homeAlerts(cfg, states, mem, new Date(2026, 9, 23, 22, 0));
    expect(late.map((a) => `${a.title}|${a.to}`)).toEqual(["Ytterdörren är olåst|home", "Larmet larmar!|all"]);
    expect(homeAlerts(cfg, states, mem, new Date(2026, 9, 23, 21, 0)).map((a) => a.title)).toEqual(["Larmet larmar!"]);
  });

  it("sends to the adults at home, or everyone when nobody's whereabouts are known", () => {
    const anna = { id: "a", name: "Anna Svensson", kind: "adult", notify: { service: "mobile_app_anna" } } as Person;
    const emil = { id: "e", name: "Emil", kind: "adult", notify: { service: "mobile_app_emil" } } as Person;
    const off = { id: "o", name: "Olle", kind: "adult", notify: { service: "mobile_app_olle", home: false } } as Person;
    const home = new Map([st("person.anna", "home", { friendly_name: "Anna" }), st("person.emil", "not_home", { friendly_name: "Emil Axfors" })]);
    expect(alertReceivers([anna, emil, off], home, "home").map((p) => p.id)).toEqual(["a"]);
    expect(alertReceivers([anna, emil, off], new Map(), "home").map((p) => p.id)).toEqual(["a", "e"]);
    expect(alertReceivers([anna, emil, off], home, "all").map((p) => p.id)).toEqual(["a", "e"]);
  });
});
