import { describe, expect, it } from "vitest";
import { choresForToday, type Chore } from "./chores.js";

const people = [
  { id: "a", name: "Esther", color: "#f90", kind: "child" as const },
  { id: "b", name: "Ella", color: "#09f", kind: "child" as const },
  { id: "c", name: "Emil", color: "#000", kind: "adult" as const },
];
const chores: Chore[] = [
  { id: "1", personId: "a", title: "Plocka undan", days: [] },
  { id: "2", personId: "a", title: "Gympapåse", days: [2] },
  { id: "3", personId: "b", title: "Dukat bordet", days: [1, 2, 3, 4, 5] },
  { id: "4", personId: "c", title: "Vuxensyssla", days: [] },
];
const monday = new Date(2026, 9, 19, 16, 0); // 19 okt 2026 = måndag
const tuesday = new Date(2026, 9, 20, 16, 0);
const sunday = new Date(2026, 9, 25, 16, 0);

describe("sysslor", () => {
  it("shows the chores for today's weekday per child, and only for children", () => {
    const m = choresForToday(people, monday, chores, new Set());
    expect(m.map((p) => `${p.name}:${p.items.map((i) => i.title).join("+")}`)).toEqual(["Esther:Plocka undan", "Ella:Dukat bordet"]);
    const t = choresForToday(people, tuesday, chores, new Set());
    expect(t[0].items.map((i) => i.title)).toEqual(["Plocka undan", "Gympapåse"]);
  });
  it("marks done items and allDone only when everything is done", () => {
    const some = choresForToday(people, tuesday, chores, new Set(["1"]));
    expect(some[0].items.map((i) => i.done)).toEqual([true, false]);
    expect(some[0].allDone).toBe(false);
    expect(choresForToday(people, tuesday, chores, new Set(["1", "2"]))[0].allDone).toBe(true);
  });
  it("leaves out children with nothing to do today", () => {
    expect(choresForToday(people, sunday, chores, new Set()).map((p) => p.name)).toEqual(["Esther"]);
  });
});
