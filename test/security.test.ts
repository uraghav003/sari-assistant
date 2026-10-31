import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { authConfigured, checkCredentials, issueToken, verifyToken } from "../api/_security.js";

describe("SARI Security Module", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear security-related env vars before each test
    delete process.env.SARI_SESSION_SECRET;
    delete process.env.SARI_LOGIN_EMAIL;
    delete process.env.SARI_PASSWORD;
    delete process.env.SARI_PASSWORD_HASH;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("authConfigured()", () => {
    it("returns false when session secret is missing", () => {
      process.env.SARI_PASSWORD = "testpass";
      expect(authConfigured()).toBe(false);
    });

    it("returns false when session secret is too short", () => {
      process.env.SARI_SESSION_SECRET = "tooshort";
      process.env.SARI_PASSWORD = "testpass";
      expect(authConfigured()).toBe(false);
    });

    it("returns false when credentials are missing", () => {
      process.env.SARI_SESSION_SECRET = "a".repeat(64);
      expect(authConfigured()).toBe(false);
    });

    it("returns true when properly configured with password", () => {
      process.env.SARI_SESSION_SECRET = "a".repeat(64);
      process.env.SARI_PASSWORD = "testpass";
      expect(authConfigured()).toBe(true);
    });

    it("returns true when properly configured with password hash", () => {
      process.env.SARI_SESSION_SECRET = "a".repeat(64);
      process.env.SARI_PASSWORD_HASH = "b".repeat(64);
      expect(authConfigured()).toBe(true);
    });
  });

  describe("checkCredentials()", () => {
    beforeEach(() => {
      process.env.SARI_LOGIN_EMAIL = "test@example.com";
      process.env.SARI_PASSWORD = "validpassword";
    });

    it("rejects hardcoded 123456 password", () => {
      expect(checkCredentials("test@example.com", "123456")).toBe(false);
    });

    it("rejects when email is not configured", () => {
      delete process.env.SARI_LOGIN_EMAIL;
      expect(checkCredentials("test@example.com", "validpassword")).toBe(false);
    });

    it("rejects when email does not match", () => {
      expect(checkCredentials("wrong@example.com", "validpassword")).toBe(false);
    });

    it("rejects when password is wrong", () => {
      expect(checkCredentials("test@example.com", "wrongpassword")).toBe(false);
    });

    it("accepts valid credentials", () => {
      expect(checkCredentials("test@example.com", "validpassword")).toBe(true);
    });

    it("accepts valid credentials with case-insensitive email", () => {
      expect(checkCredentials("TEST@Example.COM", "validpassword")).toBe(true);
    });

    it("rejects passwords over 512 characters", () => {
      const longPassword = "a".repeat(513);
      expect(checkCredentials("test@example.com", longPassword)).toBe(false);
    });

    it("rejects non-string email", () => {
      // @ts-expect-error — testing runtime type guard with invalid input
      expect(checkCredentials(null, "validpassword")).toBe(false);
      // @ts-expect-error — testing runtime type guard with invalid input
      expect(checkCredentials(undefined, "validpassword")).toBe(false);
      // @ts-expect-error — testing runtime type guard with invalid input
      expect(checkCredentials(123, "validpassword")).toBe(false);
    });

    it("rejects non-string password", () => {
      // @ts-expect-error — testing runtime type guard with invalid input
      expect(checkCredentials("test@example.com", null)).toBe(false);
      // @ts-expect-error — testing runtime type guard with invalid input
      expect(checkCredentials("test@example.com", undefined)).toBe(false);
      // @ts-expect-error — testing runtime type guard with invalid input
      expect(checkCredentials("test@example.com", 123)).toBe(false);
    });
  });

  describe("issueToken() and verifyToken()", () => {
    it("issueToken returns null when session secret is missing", () => {
      expect(issueToken()).toBeNull();
    });

    it("verifyToken returns false when session secret is missing", () => {
      expect(verifyToken("anything")).toBe(false);
    });

    it("issueToken returns null when session secret is too short", () => {
      process.env.SARI_SESSION_SECRET = "tooshort";
      expect(issueToken()).toBeNull();
    });

    it("issues and verifies valid token with proper secret", () => {
      process.env.SARI_SESSION_SECRET = "a".repeat(64);
      const token = issueToken();
      expect(token).not.toBeNull();
      expect(verifyToken(token)).toBe(true);
    });

    it("rejects token signed with different secret", () => {
      process.env.SARI_SESSION_SECRET = "a".repeat(64);
      const token = issueToken();
      
      // Change secret
      process.env.SARI_SESSION_SECRET = "b".repeat(64);
      expect(verifyToken(token)).toBe(false);
    });
  });
});
