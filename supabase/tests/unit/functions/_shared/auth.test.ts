/**
 * Tests for authentication utilities
 *
 * Tests JWT token validation, session management, and cookie handling
 */

import { assertEquals, assert } from "jsr:@std/assert@1.0.16";
import {
  extractSessionToken,
  validateSessionToken,
  createSessionToken,
  getSessionFromRequest,
  createSessionCookie,
  createLogoutCookie,
  SESSION_COOKIE_NAME,
} from "../../../../functions/_shared/auth.ts";
import {
  saveEnvState,
  restoreEnvState,
} from "./test-utils.ts";
import { jwt } from "../../../../functions/_shared/deps.ts";

// ============================================================================
// Tests for extractSessionToken
// ============================================================================

Deno.test("extractSessionToken - valid cookie string", () => {
  const cookieString = `${SESSION_COOKIE_NAME}=test-token-value; other=value`;
  const token = extractSessionToken(cookieString);

  assertEquals(token, "test-token-value");
});

Deno.test("extractSessionToken - cookie from Headers object", () => {
  const headers = new Headers();
  headers.set("cookie", `${SESSION_COOKIE_NAME}=test-token-value`);
  const token = extractSessionToken(headers);

  assertEquals(token, "test-token-value");
});

Deno.test("extractSessionToken - missing cookie returns null", () => {
  const cookieString = "other=value; another=value2";
  const token = extractSessionToken(cookieString);

  assertEquals(token, null);
});

Deno.test("extractSessionToken - empty cookie string returns null", () => {
  const token = extractSessionToken("");

  assertEquals(token, null);
});

Deno.test("extractSessionToken - multiple cookies extracts correct one", () => {
  const cookieString = `other=value; ${SESSION_COOKIE_NAME}=correct-token; another=value2`;
  const token = extractSessionToken(cookieString);

  assertEquals(token, "correct-token");
});

Deno.test("extractSessionToken - URL-encoded cookie value", () => {
  const encodedValue = encodeURIComponent("token with spaces");
  const cookieString = `${SESSION_COOKIE_NAME}=${encodedValue}`;
  const token = extractSessionToken(cookieString);

  assertEquals(token, "token with spaces");
});

Deno.test("extractSessionToken - cookie with no value returns null", () => {
  const cookieString = `${SESSION_COOKIE_NAME}=`;
  const token = extractSessionToken(cookieString);

  assertEquals(token, null);
});

// ============================================================================
// Tests for validateSessionToken
// ============================================================================

Deno.test("validateSessionToken - valid token returns UserSession", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    const sessionData = {
      installationId: "123456",
      userLogin: "testuser",
      userId: 1,
      avatarUrl: "https://github.com/avatar.png",
    };

    const token = jwt.sign(sessionData, "test-secret-key", {
      algorithm: "HS256",
      expiresIn: "24h",
    });

    const session = validateSessionToken(token);

    assert(session !== null);
    if (session) {
      assertEquals(session.installationId, "123456");
      assertEquals(session.userLogin, "testuser");
      assertEquals(session.userId, 1);
      assertEquals(session.avatarUrl, "https://github.com/avatar.png");
    }
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test("validateSessionToken - invalid signature returns null", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    // Token signed with different secret
    const token = jwt.sign(
      { installationId: "123456", userLogin: "testuser", userId: 1 },
      "wrong-secret",
      { algorithm: "HS256", expiresIn: "24h" }
    );

    const session = validateSessionToken(token);

    assertEquals(session, null);
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test("validateSessionToken - expired token returns null", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    // Token expired 1 hour ago
    const token = jwt.sign(
      {
        installationId: "123456",
        userLogin: "testuser",
        userId: 1,
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
      },
      "test-secret-key",
      { algorithm: "HS256" }
    );

    const session = validateSessionToken(token);

    assertEquals(session, null);
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test("validateSessionToken - missing JWT_SECRET returns null", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.delete("JWT_SECRET");

    const token = jwt.sign(
      { installationId: "123456", userLogin: "testuser", userId: 1 },
      "test-secret",
      { algorithm: "HS256", expiresIn: "24h" }
    );

    const session = validateSessionToken(token);

    assertEquals(session, null);
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test("validateSessionToken - invalid payload structure returns null", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    // Token with missing required fields
    const token = jwt.sign(
      { invalid: "payload" },
      "test-secret-key",
      { algorithm: "HS256", expiresIn: "24h" }
    );

    const session = validateSessionToken(token);

    assertEquals(session, null);
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test("validateSessionToken - malformed token returns null", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    const session = validateSessionToken("not.a.valid.jwt.token");

    assertEquals(session, null);
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test("validateSessionToken - token without avatarUrl", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    const sessionData = {
      installationId: "123456",
      userLogin: "testuser",
      userId: 1,
    };

    const token = jwt.sign(sessionData, "test-secret-key", {
      algorithm: "HS256",
      expiresIn: "24h",
    });

    const session = validateSessionToken(token);

    assert(session !== null);
    if (session) {
      assertEquals(session.avatarUrl, undefined);
    }
  } finally {
    restoreEnvState(saved);
  }
});

// ============================================================================
// Tests for createSessionToken
// ============================================================================

Deno.test("createSessionToken - creates valid token", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    const sessionData = {
      installationId: "123456",
      userLogin: "testuser",
      userId: 1,
      avatarUrl: "https://github.com/avatar.png",
    };

    const token = createSessionToken(sessionData);

    assertEquals(typeof token, "string");
    assert(token.length > 0);

    // Verify token can be decoded
    const decoded = jwt.verify(token, "test-secret-key", {
      algorithms: ["HS256"],
    });
    assert(decoded !== null);
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test("createSessionToken - missing JWT_SECRET throws error", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.delete("JWT_SECRET");

    const sessionData = {
      installationId: "123456",
      userLogin: "testuser",
      userId: 1,
    };

    let errorThrown = false;
    try {
      createSessionToken(sessionData);
    } catch (error) {
      errorThrown = true;
      assert(error instanceof Error);
      if (error instanceof Error) {
        assert(error.message.includes("JWT_SECRET"));
      }
    }

    assert(errorThrown);
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test("createSessionToken - token without avatarUrl", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    const sessionData = {
      installationId: "123456",
      userLogin: "testuser",
      userId: 1,
    };

    const token = createSessionToken(sessionData);

    assertEquals(typeof token, "string");
    assert(token.length > 0);
  } finally {
    restoreEnvState(saved);
  }
});

// ============================================================================
// Tests for getSessionFromRequest
// ============================================================================

Deno.test("getSessionFromRequest - valid cookie returns session", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    const sessionData = {
      installationId: "123456",
      userLogin: "testuser",
      userId: 1,
    };

    const token = jwt.sign(sessionData, "test-secret-key", {
      algorithm: "HS256",
      expiresIn: "24h",
    });

    const request = new Request("https://example.com", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      },
    });

    const session = getSessionFromRequest(request);

    assert(session !== null);
    if (session) {
      assertEquals(session.userLogin, "testuser");
    }
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test("getSessionFromRequest - invalid cookie returns null", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    const request = new Request("https://example.com", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=invalid-token`,
      },
    });

    const session = getSessionFromRequest(request);

    assertEquals(session, null);
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test("getSessionFromRequest - missing cookie returns null", () => {
  const request = new Request("https://example.com");

  const session = getSessionFromRequest(request);

  assertEquals(session, null);
});

Deno.test("getSessionFromRequest - expired token returns null", () => {
  const saved = saveEnvState(["JWT_SECRET"]);
  try {
    Deno.env.set("JWT_SECRET", "test-secret-key");

    const expiredToken = jwt.sign(
      {
        installationId: "123456",
        userLogin: "testuser",
        userId: 1,
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
      },
      "test-secret-key",
      { algorithm: "HS256" }
    );

    const request = new Request("https://example.com", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(expiredToken)}`,
      },
    });

    const session = getSessionFromRequest(request);

    assertEquals(session, null);
  } finally {
    restoreEnvState(saved);
  }
});

// ============================================================================
// Tests for createSessionCookie
// ============================================================================

Deno.test("createSessionCookie - default maxAge (24h)", () => {
  const token = "test-token";
  const cookie = createSessionCookie(token);

  assert(cookie.includes(`${SESSION_COOKIE_NAME}=`));
  assert(cookie.includes("HttpOnly"));
  assert(cookie.includes("Secure"));
  assert(cookie.includes("SameSite=Strict"));
  assert(cookie.includes("Path=/"));
  assert(cookie.includes("Max-Age=86400")); // 24 hours in seconds
});

Deno.test("createSessionCookie - custom maxAge", () => {
  const token = "test-token";
  const cookie = createSessionCookie(token, 3600); // 1 hour

  assert(cookie.includes("Max-Age=3600"));
});

Deno.test("createSessionCookie - URL encodes token", () => {
  const token = "token with spaces";
  const cookie = createSessionCookie(token);

  assert(cookie.includes(encodeURIComponent(token)));
});

Deno.test("createSessionCookie - includes all security flags", () => {
  const token = "test-token";
  const cookie = createSessionCookie(token);

  assert(cookie.includes("HttpOnly"));
  assert(cookie.includes("Secure"));
  assert(cookie.includes("SameSite=Strict"));
});

// ============================================================================
// Tests for createLogoutCookie
// ============================================================================

Deno.test("createLogoutCookie - sets Max-Age to 0", () => {
  const cookie = createLogoutCookie();

  assert(cookie.includes(`${SESSION_COOKIE_NAME}=`));
  assert(cookie.includes("Max-Age=0"));
});

Deno.test("createLogoutCookie - includes all security flags", () => {
  const cookie = createLogoutCookie();

  assert(cookie.includes("HttpOnly"));
  assert(cookie.includes("Secure"));
  assert(cookie.includes("SameSite=Strict"));
  assert(cookie.includes("Path=/"));
});

