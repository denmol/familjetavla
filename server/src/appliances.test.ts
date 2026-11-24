import { describe, expect, it } from "vitest";
import type { HaState } from "./connectors/ha.js";
import { buildAppliances, minutesLeft, phaseOf } from "./appliances.js";
import type { Config } from "./types.js";

const st = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): [string, HaState] => [entity_id, { entity_id, state, attributes } as HaState];

describe("Husgeråd – every brand's words", () => {
  it("reads Miele, Home Connect, SmartThings and LG by meaning", () => {
    expect(phaseOf("in_use", undefined)).toBe("running"); // Miele
    expect(phaseOf("program_ended", undefined)).toBe("done");
    expect(phaseOf("on", undefined)).toBe("idle");
    expect(phaseOf("run", undefined)).toBe("running"); // Home Connect, SmartThings
    expect(phaseOf("BSH.Common.EnumType.OperationState.Finished", undefined)).toBe("done");
    expect(phaseOf("BSH.Common.EnumType.OperationState.Ready", undefined)).toBe("idle");
    expect(phaseOf("actionrequired", undefined)).toBe("error");
    expect(phaseOf("delayedstart", undefined)).toBe("idle");
    expect(phaseOf("rinsing", undefined)).toBe("running"); // LG
    expect(phaseOf("pause", undefined)).toBe("paused");
    expect(phaseOf("failure", undefined)).toBe("error");
  });

  it("uses the power plug when there is no state sensor", () => {
    expect(phaseOf(undefined, 1850)).toBe("running");
    expect(phaseOf(undefined, 0.8)).toBe("idle");
  });

  it("reads time left in minutes, hours, seconds, as a time or a finish timestamp", () => {
    const now = new Date("2026-10-23T10:00:00Z");
    expect(minutesLeft(st("s", "42", { unit_of_measurement: "min" })[1], now)).toBe(42);
    expect(minutesLeft(st("s", "1.5", { unit_of_measurement: "h" })[1], now)).toBe(90);
    expect(minutesLeft(st("s", "600", { unit_of_measurement: "s" })[1], now)).toBe(10);
    expect(minutesLeft(st("s", "1:25")[1], now)).toBe(85);
    expect(minutesLeft(st("s", "2026-10-23T10:35:00+00:00", { device_class: "timestamp" })[1], now)).toBe(35);
    expect(minutesLeft(st("s", "unknown")[1], now)).toBeUndefined();
  });

  it("says what the family needs to know", () => {
    const now = new Date(2026, 9, 23, 10, 0);
    const cfg = {
      entities: {
        appliances: [
          { name: "Tvättmaskinen", kind: "washer", status: "sensor.wm_status", remaining: "sensor.wm_left", progress: "sensor.wm_progress" },
          { name: "Diskmaskinen", kind: "dishwasher", status: "sensor.dw_state" },
          { name: "Torktumlaren", kind: "dryer", power: "sensor.plug_power" },
        ],
      },
    } as unknown as Config;
    const [wm, dw, dry] = buildAppliances(
      cfg,
      new Map([st("sensor.wm_status", "in_use"), st("sensor.wm_left", "42", { unit_of_measurement: "min" }), st("sensor.wm_progress", "61.4"), st("sensor.dw_state", "finished"), st("sensor.plug_power", "0")]),
      now,
    )!;
    expect(wm).toMatchObject({ phase: "running", label: "Tvättar – 42 min kvar", endsAt: "10:42", progress: 61 });
    expect(dw).toMatchObject({ phase: "done", label: "Klar" });
    expect(dry).toMatchObject({ phase: "idle", label: "Av" });
  });
});

describe("finding machines in Home Assistant", () => {
  it("finds Miele, Home Connect and a plug, and never a car", async () => {
    const { findAppliances } = await import("./discovery.js");
    const e = (id: string, n: string, d: string, dn: string, extra: Record<string, unknown> = {}) => ({ e: id, n, a: null, d, dn, m: null, mo: null, dc: null, u: null, st: "idle", lu: "", ...extra }) as never;
    const found = findAppliances([
      e("sensor.tvattmaskin", "Tvättmaskin", "d1", "Tvättmaskin", { st: "off" }),
      e("sensor.tvattmaskin_aterstaende_tid", "Tvättmaskin Återstående tid", "d1", "Tvättmaskin", { u: "min", st: "0" }),
      e("sensor.tvattmaskin_energiforbrukning", "Tvättmaskin Energiförbrukning", "d1", "Tvättmaskin", { u: "kWh", st: "1.2" }),
      e("sensor.dishwasher_operation_state", "Dishwasher Operation state", "d2", "Dishwasher", { dc: "enum", st: "ready" }),
      e("sensor.dishwasher_program_finish_time", "Dishwasher Program finish time", "d2", "Dishwasher", { dc: "timestamp", st: "2026-10-23T10:00:00Z" }),
      e("sensor.dishwasher_program_progress", "Dishwasher Program progress", "d2", "Dishwasher", { u: "%", st: "40" }),
      e("sensor.plug_power", "Torktumlare Effekt", "d3", "Torktumlare", { u: "W", dc: "power", st: "0" }),
      e("sensor.tesla_battery", "Tesla Battery", "d4", "Tesla MY", { u: "%", st: "80" }),
    ]);
    expect(found).toEqual([
      { name: "Tvättmaskin", kind: "washer", status: "sensor.tvattmaskin", remaining: "sensor.tvattmaskin_aterstaende_tid" },
      { name: "Dishwasher", kind: "dishwasher", status: "sensor.dishwasher_operation_state", remaining: "sensor.dishwasher_program_finish_time", progress: "sensor.dishwasher_program_progress" },
      { name: "Torktumlare", kind: "dryer", power: "sensor.plug_power" },
    ]);
  });
});
