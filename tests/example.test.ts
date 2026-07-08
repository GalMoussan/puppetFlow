import { describe, it, expect } from "vitest";

describe("Example test suite", () => {
  it("should pass a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("should work with arrays", () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it("should work with objects", () => {
    const obj = { name: "PuppetFlow", version: "0.1.0" };
    expect(obj).toHaveProperty("name");
    expect(obj.name).toBe("PuppetFlow");
  });
});
