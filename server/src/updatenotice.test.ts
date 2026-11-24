import { describe, expect, it } from "vitest";
import { updateNotice } from "./updates.js";

describe("notis om ny version", () => {
  it("makes one notice per version and none without a newer version", () => {
    expect(updateNotice(undefined, undefined)).toBeUndefined();
    const n = updateNotice({ latest: "0.15.0", current: "0.14.0" }, undefined)!;
    expect(n.version).toBe("0.15.0");
    expect(n.message).toContain("0.15.0");
    expect(n.message).toContain("0.14.0");
    expect(updateNotice({ latest: "0.15.0", current: "0.14.0" }, "0.15.0")).toBeUndefined();
    expect(updateNotice({ latest: "0.16.0", current: "0.14.0" }, "0.15.0")?.version).toBe("0.16.0");
  });
});
