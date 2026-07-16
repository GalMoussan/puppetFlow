/**
 * Scene import domain tests
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseSceneMarkdown,
  importSceneFromMarkdown,
} from "@/packages/domain/scene-import";

const fixture = readFileSync(
  join(__dirname, "fixtures/barbershop-scene.md"),
  "utf8"
);

describe("parseSceneMarkdown", () => {
  it("returns empty warning for blank paste", () => {
    const parsed = parseSceneMarkdown("   ");
    expect(parsed.stages).toHaveLength(0);
    expect(parsed.warnings[0]).toMatch(/empty/i);
  });

  it("detects all four stages on barbershop fixture", () => {
    const parsed = parseSceneMarkdown(fixture);
    const keys = parsed.stages.map((s) => s.key);
    expect(keys).toEqual([
      "IMAGE",
      "VIDEO_START",
      "EXTEND_MIDDLE",
      "EXTEND_END",
    ]);
  });

  it("extracts cameras for video stages", () => {
    const parsed = parseSceneMarkdown(fixture);
    const start = parsed.stages.find((s) => s.key === "VIDEO_START");
    const middle = parsed.stages.find((s) => s.key === "EXTEND_MIDDLE");
    const end = parsed.stages.find((s) => s.key === "EXTEND_END");
    expect(start?.camera).toMatch(/Macro push-in/i);
    expect(middle?.camera).toMatch(/Snap-zoom/i);
    expect(end?.camera).toMatch(/Crash-zoom/i);
  });

  it("extracts ending frames and OPEN continuation", () => {
    const parsed = parseSceneMarkdown(fixture);
    const start = parsed.stages.find((s) => s.key === "VIDEO_START");
    const middle = parsed.stages.find((s) => s.key === "EXTEND_MIDDLE");
    expect(start?.endingFrame).toMatch(/mid-grab/i);
    expect(middle?.openContinuation).toMatch(/Continue directly/i);
    expect(middle?.endingFrame).toMatch(/double-blink/i);
  });

  it("extracts CRITICAL character locks verbatim", () => {
    const parsed = parseSceneMarkdown(fixture);
    expect(parsed.characterLocks.length).toBeGreaterThanOrEqual(1);
    const joined = parsed.characterLocks.map((l) => l.text).join("\n");
    expect(joined).toContain("CRITICAL");
    expect(joined).toMatch(/Shika Shikamaru/);
    expect(joined).toMatch(/Shilshul/);
  });

  it("extracts location and chaos", () => {
    const parsed = parseSceneMarkdown(fixture);
    expect(parsed.location).toMatch(/barbershop/i);
    expect(parsed.chaosThreads.length).toBeGreaterThanOrEqual(1);
    expect(parsed.chaosThreads[0]).toMatch(/barber chair/i);
  });

  it("extracts style lock from image head", () => {
    const parsed = parseSceneMarkdown(fixture);
    expect(parsed.styleLock).toMatch(/ARRI Alexa|Hyperrealistic/i);
  });
});

describe("planImport", () => {
  it("plans character locks, cameras, chaos, and payoff blocks", () => {
    const { plan } = importSceneFromMarkdown(fixture);
    expect(plan.blocks.length).toBeGreaterThan(5);
    expect(plan.blocks.length).toBeLessThanOrEqual(18);

    const types = new Set(plan.blocks.map((b) => b.type));
    expect(types.has("CHARACTER_LOCK")).toBe(true);
    expect(types.has("CAMERA_MOVE")).toBe(true);
    expect(types.has("CHAOS_THREAD")).toBe(true);
    expect(types.has("PAYOFF") || types.has("PUPPET_DYNAMIC")).toBe(true);

    const locks = plan.blocks.filter((b) => b.type === "CHARACTER_LOCK");
    expect(locks.every((b) => b.pinned)).toBe(true);
    expect(locks[0].promptFragment).toContain("CRITICAL");
  });

  it("builds a canvas graph with nodes and handshake edges", () => {
    const { plan } = importSceneFromMarkdown(fixture);
    expect(plan.graph.version).toBe(1);
    expect(plan.graph.nodes.length).toBe(plan.blocks.length);
    expect(plan.graph.edges.length).toBeGreaterThanOrEqual(1);
    expect(plan.stats.stages).toContain("IMAGE");
    expect(plan.stats.stages).toContain("VIDEO_START");
  });

  it("places blocks on expected lanes", () => {
    const { plan } = importSceneFromMarkdown(fixture);
    const lanes = new Set(plan.blocks.map((b) => b.lane));
    expect(lanes.has("GLOBAL") || lanes.has("IMAGE")).toBe(true);
    expect(lanes.has("VIDEO_START")).toBe(true);
  });
});
