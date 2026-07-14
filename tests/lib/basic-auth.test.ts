/**
 * T501 — Basic auth helpers
 */

import { describe, it, expect } from "vitest";
import {
  parseBasicAuthHeader,
  credentialsMatch,
  shouldEnforceBasicAuth,
  unauthorizedResponse,
} from "@/lib/basic-auth";

describe("lib/basic-auth", () => {
  describe("parseBasicAuthHeader", () => {
    it("returns null for missing header", () => {
      expect(parseBasicAuthHeader(null)).toBeNull();
      expect(parseBasicAuthHeader(undefined)).toBeNull();
      expect(parseBasicAuthHeader("")).toBeNull();
    });

    it("returns null for non-Basic schemes", () => {
      expect(parseBasicAuthHeader("Bearer token")).toBeNull();
    });

    it("parses valid Basic credentials", () => {
      const token = Buffer.from("admin:s3cret", "utf8").toString("base64");
      expect(parseBasicAuthHeader(`Basic ${token}`)).toEqual({
        username: "admin",
        password: "s3cret",
      });
    });

    it("handles passwords containing colons", () => {
      const token = Buffer.from("user:pass:with:colons", "utf8").toString(
        "base64"
      );
      expect(parseBasicAuthHeader(`Basic ${token}`)).toEqual({
        username: "user",
        password: "pass:with:colons",
      });
    });

    it("returns null for malformed base64", () => {
      expect(parseBasicAuthHeader("Basic !!!")).toBeNull();
    });
  });

  describe("credentialsMatch", () => {
    it("accepts matching credentials", () => {
      expect(
        credentialsMatch(
          { username: "admin", password: "pw" },
          "admin",
          "pw"
        )
      ).toBe(true);
    });

    it("rejects wrong password or user", () => {
      expect(
        credentialsMatch(
          { username: "admin", password: "wrong" },
          "admin",
          "pw"
        )
      ).toBe(false);
      expect(
        credentialsMatch({ username: "x", password: "pw" }, "admin", "pw")
      ).toBe(false);
    });

    it("rejects null parsed credentials", () => {
      expect(credentialsMatch(null, "admin", "pw")).toBe(false);
    });
  });

  describe("shouldEnforceBasicAuth", () => {
    it("is false when DISABLE_BASIC_AUTH is set", () => {
      expect(
        shouldEnforceBasicAuth({
          APP_USER: "a",
          APP_PASSWORD: "b",
          DISABLE_BASIC_AUTH: "true",
        })
      ).toBe(false);
    });

    it("is false when credentials missing", () => {
      expect(shouldEnforceBasicAuth({ NODE_ENV: "production" })).toBe(false);
      expect(
        shouldEnforceBasicAuth({ APP_USER: "a", APP_PASSWORD: "" })
      ).toBe(false);
    });

    it("is true when user and password present and not disabled", () => {
      expect(
        shouldEnforceBasicAuth({
          APP_USER: "admin",
          APP_PASSWORD: "secret",
          NODE_ENV: "production",
        })
      ).toBe(true);
    });
  });

  describe("unauthorizedResponse", () => {
    it("returns 401 with WWW-Authenticate challenge", () => {
      const res = unauthorizedResponse();
      expect(res.status).toBe(401);
      expect(res.headers.get("WWW-Authenticate")).toMatch(/Basic/i);
      expect(res.headers.get("WWW-Authenticate")).toMatch(/PuppetFlow/i);
    });
  });
});
