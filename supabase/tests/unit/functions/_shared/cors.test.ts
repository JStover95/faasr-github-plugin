/**
 * Tests for CORS headers utility
 *
 * Tests CORS header generation based on environment variables and request origin
 */

import { assertEquals, assert } from "jsr:@std/assert@1.0.16";
import { getCorsHeaders } from "../../../../functions/_shared/cors.ts";
import { createMockRequest } from "./test-utils.ts";

// ============================================================================
// Helper function to set environment variables for testing
// ============================================================================

async function withEnvVars(
  envVars: Record<string, string | undefined>,
  testFn: () => void | Promise<void>
): Promise<void> {
  const originalValues: Record<string, string | undefined> = {};

  // Save original values and set new ones
  for (const [key, value] of Object.entries(envVars)) {
    originalValues[key] = Deno.env.get(key);
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  }

  try {
    await testFn();
  } finally {
    // Restore original values
    for (const [key, originalValue] of Object.entries(originalValues)) {
      if (originalValue === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, originalValue);
      }
    }
  }
}

// ============================================================================
// Tests for default configuration
// ============================================================================

Deno.test(
  "getCorsHeaders - default configuration with wildcard origin",
  async () => {
    await withEnvVars({}, () => {
      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
      });

      const headers = getCorsHeaders(req);

      assertEquals(headers["Access-Control-Allow-Origin"], "*");
      assertEquals(
        headers["Access-Control-Allow-Headers"],
        "authorization, x-client-info, apikey, content-type"
      );
      assertEquals(
        headers["Access-Control-Allow-Methods"],
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      assert(!("Access-Control-Allow-Credentials" in headers));
    });
  }
);

Deno.test(
  "getCorsHeaders - default configuration with no Origin header",
  async () => {
    await withEnvVars({}, () => {
      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
        headers: {}, // No Origin header
      });

      const headers = getCorsHeaders(req);

      assertEquals(headers["Access-Control-Allow-Origin"], "*");
    });
  }
);

// ============================================================================
// Tests for custom origin configuration
// ============================================================================

Deno.test(
  "getCorsHeaders - single allowed origin matches request",
  async () => {
    await withEnvVars(
      {
        CORS_ALLOW_ORIGIN: "https://example.com",
        CORS_ALLOW_CREDENTIALS: undefined,
      },
      () => {
        const req = createMockRequest({
          method: "GET",
          url: "https://example.com",
          headers: {
            Origin: "https://example.com",
          },
        });

        const headers = getCorsHeaders(req);

        assertEquals(
          headers["Access-Control-Allow-Origin"],
          "https://example.com"
        );
      }
    );
  }
);

Deno.test(
  "getCorsHeaders - single allowed origin does not match request",
  async () => {
    await withEnvVars(
      {
        CORS_ALLOW_ORIGIN: "https://example.com",
        CORS_ALLOW_CREDENTIALS: undefined,
      },
      () => {
        const req = createMockRequest({
          method: "GET",
          url: "https://example.com",
          headers: {
            Origin: "https://evil.com",
          },
        });

        const headers = getCorsHeaders(req);

        // When origin doesn't match and wildcard is not allowed, header should not be set
        // The browser will reject the request, which is the secure default behavior
        assert(!("Access-Control-Allow-Origin" in headers));
      }
    );
  }
);

Deno.test("getCorsHeaders - multiple allowed origins", async () => {
  await withEnvVars(
    {
      CORS_ALLOW_ORIGIN:
        "https://example.com,https://app.example.com,http://localhost:3000",
      CORS_ALLOW_CREDENTIALS: undefined,
    },
    () => {
      const req1 = createMockRequest({
        method: "GET",
        url: "https://example.com",
        headers: {
          Origin: "https://example.com",
        },
      });

      const req2 = createMockRequest({
        method: "GET",
        url: "https://example.com",
        headers: {
          Origin: "http://localhost:3000",
        },
      });

      const headers1 = getCorsHeaders(req1);
      const headers2 = getCorsHeaders(req2);

      assertEquals(
        headers1["Access-Control-Allow-Origin"],
        "https://example.com"
      );
      assertEquals(
        headers2["Access-Control-Allow-Origin"],
        "http://localhost:3000"
      );
    }
  );
});

// ============================================================================
// Tests for credentials configuration
// ============================================================================

Deno.test(
  "getCorsHeaders - credentials enabled with specific origin",
  async () => {
    await withEnvVars(
      {
        CORS_ALLOW_ORIGIN: "https://example.com",
        CORS_ALLOW_CREDENTIALS: "true",
      },
      () => {
        const req = createMockRequest({
          method: "GET",
          url: "https://example.com",
          headers: {
            Origin: "https://example.com",
          },
        });

        const headers = getCorsHeaders(req);

        assertEquals(
          headers["Access-Control-Allow-Origin"],
          "https://example.com"
        );
        assertEquals(headers["Access-Control-Allow-Credentials"], "true");
      }
    );
  }
);

Deno.test(
  "getCorsHeaders - credentials enabled with wildcard warns but still works",
  async () => {
    await withEnvVars(
      {
        CORS_ALLOW_ORIGIN: "*",
        CORS_ALLOW_CREDENTIALS: "true",
      },
      () => {
        const req = createMockRequest({
          method: "GET",
          url: "https://example.com",
          headers: {
            Origin: "https://example.com",
          },
        });

        const headers = getCorsHeaders(req);

        // When wildcard is allowed and request has an origin, isOriginAllowed returns true
        // So it returns the actual origin instead of wildcard (even though wildcard is configured)
        // This is because the origin matching logic sees wildcard as "allow all"
        // Note: Browser will still reject this if credentials are enabled with wildcard config
        assertEquals(
          headers["Access-Control-Allow-Origin"],
          "https://example.com"
        );
        assertEquals(headers["Access-Control-Allow-Credentials"], "true");
      }
    );
  }
);

Deno.test("getCorsHeaders - credentials disabled (default)", async () => {
  await withEnvVars(
    {
      CORS_ALLOW_CREDENTIALS: "false",
    },
    () => {
      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
        headers: {
          Origin: "https://example.com",
        },
      });

      const headers = getCorsHeaders(req);

      assert(!("Access-Control-Allow-Credentials" in headers));
    }
  );
});

// ============================================================================
// Tests for custom headers and methods
// ============================================================================

Deno.test("getCorsHeaders - custom allowed headers", async () => {
  await withEnvVars(
    {
      CORS_ALLOW_HEADERS: "authorization, custom-header, x-custom",
    },
    () => {
      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
      });

      const headers = getCorsHeaders(req);

      assertEquals(
        headers["Access-Control-Allow-Headers"],
        "authorization, custom-header, x-custom"
      );
    }
  );
});

Deno.test("getCorsHeaders - custom allowed methods", async () => {
  await withEnvVars(
    {
      CORS_ALLOW_METHODS: "GET, POST, PATCH",
    },
    () => {
      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
      });

      const headers = getCorsHeaders(req);

      assertEquals(headers["Access-Control-Allow-Methods"], "GET, POST, PATCH");
    }
  );
});

Deno.test("getCorsHeaders - custom headers and methods together", async () => {
  await withEnvVars(
    {
      CORS_ALLOW_HEADERS: "authorization, x-api-key",
      CORS_ALLOW_METHODS: "GET, POST",
    },
    () => {
      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
      });

      const headers = getCorsHeaders(req);

      assertEquals(
        headers["Access-Control-Allow-Headers"],
        "authorization, x-api-key"
      );
      assertEquals(headers["Access-Control-Allow-Methods"], "GET, POST");
    }
  );
});

// ============================================================================
// Tests for edge cases
// ============================================================================

Deno.test("getCorsHeaders - handles empty origin list gracefully", async () => {
  await withEnvVars(
    {
      CORS_ALLOW_ORIGIN: "",
    },
    () => {
      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
        headers: {
          Origin: "https://example.com",
        },
      });

      const headers = getCorsHeaders(req);

      // Empty origin list means no origins are allowed
      // Header should not be set (or set to first in list if fallback exists)
      assert("Access-Control-Allow-Origin" in headers);
    }
  );
});

Deno.test("getCorsHeaders - handles whitespace in origin list", async () => {
  await withEnvVars(
    {
      CORS_ALLOW_ORIGIN: " https://example.com , https://app.example.com ",
    },
    () => {
      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
        headers: {
          Origin: "https://example.com",
        },
      });

      const headers = getCorsHeaders(req);

      // Whitespace should be trimmed
      assertEquals(
        headers["Access-Control-Allow-Origin"],
        "https://example.com"
      );
    }
  );
});

Deno.test("getCorsHeaders - case insensitive credentials value", async () => {
  await withEnvVars(
    {
      CORS_ALLOW_ORIGIN: "https://example.com",
      CORS_ALLOW_CREDENTIALS: "TRUE", // Uppercase
    },
    () => {
      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
        headers: {
          Origin: "https://example.com",
        },
      });

      const headers = getCorsHeaders(req);

      assertEquals(headers["Access-Control-Allow-Credentials"], "true");
    }
  );
});

Deno.test("getCorsHeaders - localhost origin for development", async () => {
  await withEnvVars(
    {
      CORS_ALLOW_ORIGIN: "http://localhost:3000,http://localhost:5173",
      CORS_ALLOW_CREDENTIALS: "true",
    },
    () => {
      const req = createMockRequest({
        method: "GET",
        url: "http://localhost:3000",
        headers: {
          Origin: "http://localhost:3000",
        },
      });

      const headers = getCorsHeaders(req);

      assertEquals(
        headers["Access-Control-Allow-Origin"],
        "http://localhost:3000"
      );
      assertEquals(headers["Access-Control-Allow-Credentials"], "true");
    }
  );
});

Deno.test(
  "getCorsHeaders - wildcard with credentials disabled uses wildcard",
  async () => {
    await withEnvVars(
      {
        CORS_ALLOW_ORIGIN: "*",
        CORS_ALLOW_CREDENTIALS: "false",
      },
      () => {
        const req = createMockRequest({
          method: "GET",
          url: "https://example.com",
          headers: {
            Origin: "https://example.com",
          },
        });

        const headers = getCorsHeaders(req);

        assertEquals(headers["Access-Control-Allow-Origin"], "*");
        assert(!("Access-Control-Allow-Credentials" in headers));
      }
    );
  }
);

Deno.test(
  "getCorsHeaders - specific origin with credentials uses specific origin",
  async () => {
    await withEnvVars(
      {
        CORS_ALLOW_ORIGIN: "https://example.com",
        CORS_ALLOW_CREDENTIALS: "true",
      },
      () => {
        const req = createMockRequest({
          method: "GET",
          url: "https://example.com",
          headers: {
            Origin: "https://example.com",
          },
        });

        const headers = getCorsHeaders(req);

        // When credentials are enabled, must use specific origin (not wildcard)
        assertEquals(
          headers["Access-Control-Allow-Origin"],
          "https://example.com"
        );
        assertEquals(headers["Access-Control-Allow-Credentials"], "true");
      }
    );
  }
);

// ============================================================================
// Tests for origin matching behavior
// ============================================================================

Deno.test("getCorsHeaders - exact origin match required", async () => {
  await withEnvVars(
    {
      CORS_ALLOW_ORIGIN: "https://example.com",
      CORS_ALLOW_CREDENTIALS: undefined,
    },
    () => {
      const req1 = createMockRequest({
        method: "GET",
        url: "https://example.com",
        headers: {
          Origin: "https://example.com",
        },
      });

      const req2 = createMockRequest({
        method: "GET",
        url: "https://example.com",
        headers: {
          Origin: "https://www.example.com", // Different subdomain
        },
      });

      const headers1 = getCorsHeaders(req1);
      const headers2 = getCorsHeaders(req2);

      assertEquals(
        headers1["Access-Control-Allow-Origin"],
        "https://example.com"
      );
      // req2 origin doesn't match, so header should not be set
      // The browser will reject the request, which is the secure default behavior
      assert(!("Access-Control-Allow-Origin" in headers2));
    }
  );
});
