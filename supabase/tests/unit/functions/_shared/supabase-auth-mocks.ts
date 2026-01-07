// deno-coverage-ignore-file

/**
 * Supabase Auth mocks for testing
 *
 * Provides mock implementations of Supabase Auth Admin API and client methods
 * for use in unit and integration tests.
 */

export interface MockSupabaseAuthConfig {
  listUsers?: () => Promise<{
    data: { users: Array<unknown> };
    error: unknown;
  }>;
  createUser?: (params: {
    email: string;
    user_metadata: unknown;
  }) => Promise<{ data: { user: unknown }; error: unknown }>;
  updateUserById?: (
    id: string,
    params: { user_metadata: unknown }
  ) => Promise<{ data: { user: unknown }; error: unknown }>;
  createSession?: (
    params: unknown
  ) => Promise<{ data: { session: unknown }; error: unknown }>;
  getUser?: () => Promise<{ data: { user: unknown | null }; error: unknown }>;
  signInWithPassword?: (
    params: unknown
  ) => Promise<{ data: { session: unknown }; error: unknown }>;
}

/**
 * Create mock Supabase Admin client
 *
 * @param config - Optional configuration for mock behavior
 * @returns Mock Supabase Admin client
 */
export function createMockSupabaseAdmin(config: MockSupabaseAuthConfig = {}) {
  return {
    auth: {
      admin: {
        listUsers:
          config.listUsers ||
          (() =>
            Promise.resolve({
              data: { users: [] },
              error: null,
            })),
        createUser:
          config.createUser ||
          ((params: { email: string; user_metadata: unknown }) =>
            Promise.resolve({
              data: {
                user: {
                  id: "test-user-id",
                  email: params.email,
                  user_metadata: params.user_metadata,
                  created_at: new Date().toISOString(),
                },
              },
              error: null,
            })),
        updateUserById:
          config.updateUserById ||
          ((id: string, params: { user_metadata: unknown }) =>
            Promise.resolve({
              data: {
                user: {
                  id,
                  email: `github-123@faasr.app`,
                  user_metadata: params.user_metadata,
                  created_at: new Date().toISOString(),
                },
              },
              error: null,
            })),
        createSession:
          config.createSession ||
          (() =>
            Promise.resolve({
              data: {
                session: {
                  access_token: "mock-access-token",
                  refresh_token: "mock-refresh-token",
                },
              },
              error: null,
            })),
      },
      getUser:
        config.getUser ||
        (() =>
          Promise.resolve({
            data: { user: null },
            error: new Error("Not authenticated"),
          })),
    },
  };
}

/**
 * Create mock Supabase client (anon key)
 *
 * @param config - Optional configuration for mock behavior
 * @returns Mock Supabase client
 */
export function createMockSupabaseClient(config: MockSupabaseAuthConfig = {}) {
  return {
    auth: {
      getUser:
        config.getUser ||
        (() =>
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
          })),
      signInWithPassword:
        config.signInWithPassword ||
        (() =>
          Promise.resolve({
            data: {
              session: {
                access_token: "mock-access-token",
                refresh_token: "mock-refresh-token",
              },
            },
            error: null,
          })),
    },
  };
}
