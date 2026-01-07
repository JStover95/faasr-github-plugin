/**
 * Tests for Supabase Auth utilities
 *
 * Tests user creation, session management, and request authentication
 */

import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1.0.16";
import { stub } from "jsr:@std/testing@1.0.16/mock";
import {
  createSupabaseAdmin,
  createOrUpdateSupabaseUser,
  getUserFromRequest,
  deps,
} from "../../../../functions/_shared/supabase-auth.ts";
import {
  createMockSupabaseAdmin,
  createMockSupabaseClient,
} from "./supabase-auth-mocks.ts";
import { createMockRequest } from "./test-utils.ts";
import { saveEnvState, restoreEnvState } from "./test-utils.ts";

// ============================================================================
// Tests for createSupabaseAdmin
// ============================================================================

Deno.test("createSupabaseAdmin - returns client when env vars are set", () => {
  const saved = saveEnvState(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  try {
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    const client = createSupabaseAdmin();
    assert(client !== null);
    assert(typeof client.auth === "object");
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test(
  "createSupabaseAdmin - throws error when SUPABASE_URL is missing",
  async () => {
    const saved = saveEnvState(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
    try {
      Deno.env.delete("SUPABASE_URL");
      Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

      await assertRejects(
        async () => await Promise.resolve(createSupabaseAdmin()),
        Error
      );
    } finally {
      restoreEnvState(saved);
    }
  }
);

Deno.test(
  "createSupabaseAdmin - throws error when SERVICE_ROLE_KEY is missing",
  async () => {
    const saved = saveEnvState(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
    try {
      Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
      Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");

      await assertRejects(
        async () => await Promise.resolve(createSupabaseAdmin()),
        Error
      );
    } finally {
      restoreEnvState(saved);
    }
  }
);

// ============================================================================
// Tests for createOrUpdateSupabaseUser
// ============================================================================

Deno.test(
  "createOrUpdateSupabaseUser - creates new user when user does not exist",
  async () => {
    const saved = saveEnvState([
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_ANON_KEY",
    ]);
    try {
      Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
      Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");
      Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

      const mockAdmin = createMockSupabaseAdmin({
        listUsers: () =>
          Promise.resolve({
            data: { users: [] },
            error: null,
          }),
        createUser: (params) =>
          Promise.resolve({
            data: {
              user: {
                id: "new-user-id",
                email: params.email,
                user_metadata: params.user_metadata,
                created_at: new Date().toISOString(),
              },
            },
            error: null,
          }),
      });

      const mockClient = createMockSupabaseClient({
        signInWithPassword: () =>
          Promise.resolve({
            data: {
              session: {
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
              },
            },
            error: null,
          }),
      });

      const createAdminStub = stub(
        deps,
        "createSupabaseAdmin",
        () =>
          mockAdmin as unknown as ReturnType<typeof deps.createSupabaseAdmin>
      );

      const createClientStub = stub(
        deps,
        "createClient",
        () => mockClient as unknown as ReturnType<typeof deps.createClient>
      );

      try {
        const result = await createOrUpdateSupabaseUser(
          "123456",
          "testuser",
          123,
          "https://example.com/avatar.png"
        );

        assertEquals(result.user.id, "new-user-id");
        assertEquals(result.user.user_metadata.installationId, "123456");
        assertEquals(result.user.user_metadata.githubLogin, "testuser");
        assertEquals(result.session.access_token, "test-access-token");
        assertEquals(result.session.refresh_token, "test-refresh-token");
      } finally {
        createAdminStub.restore();
        createClientStub.restore();
      }
    } finally {
      restoreEnvState(saved);
    }
  }
);

Deno.test("createOrUpdateSupabaseUser - updates existing user", async () => {
  const saved = saveEnvState([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);
  try {
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    const existingUser = {
      id: "existing-user-id",
      email: "github-123@faasr.app",
      user_metadata: {
        installationId: "old-installation",
        githubLogin: "olduser",
        githubId: 123,
      },
    };

    const mockAdmin = createMockSupabaseAdmin({
      listUsers: () =>
        Promise.resolve({
          data: { users: [existingUser] },
          error: null,
        }),
      updateUserById: (id, params) =>
        Promise.resolve({
          data: {
            user: {
              id,
              email: "github-123@faasr.app",
              user_metadata: params.user_metadata,
              created_at: new Date().toISOString(),
            },
          },
          error: null,
        }),
    });

    const mockClient = createMockSupabaseClient({
      signInWithPassword: () =>
        Promise.resolve({
          data: {
            session: {
              access_token: "test-access-token",
              refresh_token: "test-refresh-token",
            },
          },
          error: null,
        }),
    });

    const createAdminStub = stub(
      deps,
      "createSupabaseAdmin",
      () => mockAdmin as unknown as ReturnType<typeof deps.createSupabaseAdmin>
    );

    const createClientStub = stub(
      deps,
      "createClient",
      () => mockClient as unknown as ReturnType<typeof deps.createClient>
    );

    try {
      const result = await createOrUpdateSupabaseUser(
        "123456",
        "testuser",
        123,
        "https://example.com/avatar.png"
      );

      assertEquals(result.user.id, "existing-user-id");
      assertEquals(result.user.user_metadata.installationId, "123456");
      assertEquals(result.user.user_metadata.githubLogin, "testuser");
    } finally {
      createAdminStub.restore();
      createClientStub.restore();
    }
  } finally {
    restoreEnvState(saved);
  }
});

// ============================================================================
// Tests for getUserFromRequest
// ============================================================================

Deno.test(
  "getUserFromRequest - returns null when Authorization header is missing",
  async () => {
    const saved = saveEnvState(["SUPABASE_URL", "SUPABASE_ANON_KEY"]);
    try {
      Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
      Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
      });

      const result = await getUserFromRequest(req);
      assertEquals(result, null);
    } finally {
      restoreEnvState(saved);
    }
  }
);

Deno.test(
  "getUserFromRequest - returns null when token is invalid",
  async () => {
    const saved = saveEnvState(["SUPABASE_URL", "SUPABASE_ANON_KEY"]);
    try {
      Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
      Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

      const mockClient = createMockSupabaseClient({
        getUser: () =>
          Promise.resolve({
            data: { user: null },
            error: new Error("Invalid token"),
          }),
      });

      // Stub createClient to return mock
      const createClientStub = stub(
        deps,
        "createClient",
        () => mockClient as unknown as ReturnType<typeof deps.createClient>
      );

      try {
        const req = createMockRequest({
          method: "GET",
          url: "https://example.com",
          headers: {
            Authorization: "Bearer invalid-token",
          },
        });

        const result = await getUserFromRequest(req);
        assertEquals(result, null);
      } finally {
        createClientStub.restore();
      }
    } finally {
      restoreEnvState(saved);
    }
  }
);

Deno.test(
  "getUserFromRequest - returns UserSession when token is valid",
  async () => {
    const saved = saveEnvState(["SUPABASE_URL", "SUPABASE_ANON_KEY"]);
    try {
      Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
      Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

      const mockClient = createMockSupabaseClient({
        getUser: () =>
          Promise.resolve({
            data: {
              user: {
                id: "test-user-id",
                email: "github-123@faasr.app",
                user_metadata: {
                  installationId: "123456",
                  githubLogin: "testuser",
                  githubId: 123,
                  avatarUrl: "https://example.com/avatar.png",
                },
                created_at: new Date().toISOString(),
              },
            },
            error: null,
          }),
      });

      // Stub createClient to return mock
      const createClientStub = stub(
        deps,
        "createClient",
        () => mockClient as unknown as ReturnType<typeof deps.createClient>
      );

      try {
        const req = createMockRequest({
          method: "GET",
          url: "https://example.com",
          headers: {
            Authorization: "Bearer valid-token",
          },
        });

        const result = await getUserFromRequest(req);
        assert(result !== null);
        assertEquals(result.installationId, "123456");
        assertEquals(result.userLogin, "testuser");
        assertEquals(result.userId, 123);
        assertEquals(result.avatarUrl, "https://example.com/avatar.png");
        assertEquals(result.jwtToken, "valid-token");
      } finally {
        createClientStub.restore();
      }
    } finally {
      restoreEnvState(saved);
    }
  }
);
