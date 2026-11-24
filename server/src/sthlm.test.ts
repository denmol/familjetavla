import { describe, expect, it } from "vitest";
import { frequencyWeeks, parseSthlmSchedule } from "./connectors/waste.js";

const now = new Date(2026, 9, 23, 8);
const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("Stockholm Vatten och Avfall", () => {
  it("reads the frequency in Swedish or as a number of weeks", () => {
    expect(frequencyWeeks("Varannan vecka")).toBe(2);
    expect(frequencyWeeks("Var fjärde vecka")).toBe(4);
    expect(frequencyWeeks("Varje vecka")).toBe(1);
    expect(frequencyWeeks("Var 2:a vecka")).toBe(2);
    expect(frequencyWeeks(2)).toBe(2);
    expect(frequencyWeeks("")).toBeUndefined();
  });

  it("gives the next pickup and the ones after it, per kind", () => {
    const p = parseSthlmSchedule(
      [
        { group: "Restavfall", executionDate: "2026-10-28T00:00:00", weekday: "Onsdag", fetchFrequency: "Varannan vecka" },
        { group: "Matavfall", executionDate: "2026-10-23", weekday: "Fredag", fetchFrequency: "Varje vecka" },
      ],
      now,
      3,
    );
    expect(p.map((x) => `${day(x.date)} ${x.type}`)).toEqual(["2026-10-23 Matavfall", "2026-10-28 Restavfall", "2026-10-30 Matavfall", "2026-11-06 Matavfall", "2026-11-11 Restavfall"]);
  });

  it("also understands the older answer, grouped by kind", () => {
    const p = parseSthlmSchedule({ Restavfall: [{ ExecutionDate: "2026-11-02", FetchFrequency: "Var fjärde vecka" }] }, now, 6);
    expect(p.map((x) => `${day(x.date)} ${x.type}`)).toEqual(["2026-11-02 Restavfall", "2026-11-30 Restavfall"]);
  });

  it("leaves out what has passed and says so plainly when the answer is unknown", () => {
    expect(parseSthlmSchedule([{ group: "Restavfall", executionDate: "2026-10-01" }], now)).toEqual([]);
    expect(() => parseSthlmSchedule("<html>", now)).toThrow(/okänt format/);
  });
});
