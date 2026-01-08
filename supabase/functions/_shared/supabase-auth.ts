/**
 * Supabase Auth utilities for session management
 *
 * Provides functions for:
 * - Creating Supabase Admin client
 * - Creating/updating users with GitHub metadata
 * - Extracting user session from request
 * - Validating auth tokens
 */

import { createClient } from "./deps.ts";
import type { UserSession } from "./types.ts";
import { extractSessionToken, validateSessionToken } from "./auth.ts";

/**
 * Supabase user structure with GitHub metadata
 */
interface SupabaseUser {
  id: string;
  email: string;
  user_metadata: {
    installationId: string;
    githubLogin: string;
    githubId: number;
    avatarUrl?: string;
  };
  created_at: string;
}

/**
 * Type guard to verify user metadata has required GitHub fields
 *
 * @param metadata - User metadata object from Supabase
 * @returns True if metadata has the expected GitHub structure
 */
function hasGitHubMetadata(
  metadata: Record<string, unknown> | null | undefined
): metadata is {
  installationId: string;
  githubLogin: string;
  githubId: number;
  avatarUrl?: string;
} {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  return (
    typeof metadata.installationId === "string" &&
    typeof metadata.githubLogin === "string" &&
    typeof metadata.githubId === "number" &&
    (metadata.avatarUrl === undefined || typeof metadata.avatarUrl === "string")
  );
}

/**
 * Dependencies object for dependency injection and testing
 * This allows dependencies to be stubbed in tests
 */
export const deps = {
  createClient,
  createSupabaseAdmin: () => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
      );
    }

    return deps.createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  },
};

/**
 * Create Supabase Admin client with service role key
 * Delegates to deps.createSupabaseAdmin to allow stubbing in tests
 */
export function createSupabaseAdmin() {
  return deps.createSupabaseAdmin();
}

/**
 * Create or update Supabase user with GitHub installation metadata
 *
 * Creates a synthetic user account for each GitHub App installation.
 * Uses GitHub user ID to generate a unique email address.
 * Stores installation ID and GitHub user info in user_metadata.
 *
 * NOTE: Synthetic users are implemented as a short-term measure for
 * proof-of-concept. The MVP would include a complete flow for user
 * authentication and session management, potentially using OAuth flows
 * or other authentication mechanisms that don't require temporary passwords.
 *
 * @param installationId - GitHub App installation ID
 * @param githubLogin - GitHub username
 * @param githubId - GitHub user ID
 * @param avatarUrl - Optional GitHub avatar URL
 * @returns User object and session tokens
 */
export async function createOrUpdateSupabaseUser(
  installationId: string,
  githubLogin: string,
  githubId: number,
  avatarUrl?: string
): Promise<{
  user: SupabaseUser;
  session: { access_token: string; refresh_token: string };
}> {
  const supabase = createSupabaseAdmin();
  const email = `github-${githubId}@faasr.app`;

  // Check if user exists
  const { data: existingUsers, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const existing = existingUsers?.users.find((u) => u.email === email);

  let user: SupabaseUser;
  // Generate a secure temporary password for session creation
  const tempPassword = crypto.randomUUID();

  if (existing) {
    // Update existing user metadata and set temporary password
    const { data, error } = await supabase.auth.admin.updateUserById(
      existing.id,
      {
        password: tempPassword,
        user_metadata: {
          installationId,
          githubLogin,
          githubId,
          avatarUrl,
        },
      }
    );

    if (error || !data.user) {
      throw new Error(
        `Failed to update user: ${error?.message || "Unknown error"}`
      );
    }

    user = {
      id: data.user.id,
      email: data.user.email ?? email,
      user_metadata: {
        installationId,
        githubLogin,
        githubId,
        avatarUrl,
      },
      created_at: data.user.created_at,
    };
  } else {
    // Create new user with temporary password
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        installationId,
        githubLogin,
        githubId,
        avatarUrl,
      },
    });

    if (error || !data.user) {
      throw new Error(
        `Failed to create user: ${error?.message || "Unknown error"}`
      );
    }

    user = {
      id: data.user.id,
      email: data.user.email ?? email,
      user_metadata: {
        installationId,
        githubLogin,
        githubId,
        avatarUrl,
      },
      created_at: data.user.created_at,
    };
  }

  // Create a regular client to sign in and get session tokens
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required"
    );
  }

  const regularClient = deps.createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Sign in with the temporary password to get session tokens
  const { data: sessionData, error: sessionError } =
    await regularClient.auth.signInWithPassword({
      email: user.email,
      password: tempPassword,
    });

  if (sessionError || !sessionData.session) {
    throw new Error(
      `Failed to create session: ${sessionError?.message || "Unknown error"}`
    );
  }

  return {
    user,
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    },
  };
}

/**
 * Extract user session from request Authorization header or cookie
 *
 * First tries to validate a Supabase Auth token from the Authorization header.
 * If that fails, falls back to validating a JWT token from cookies (legacy support).
 * Converts Supabase user format to UserSession format for compatibility.
 *
 * @param req - HTTP request object
 * @returns User session if valid, null otherwise
 */
export async function getUserFromRequest(
  req: Request
): Promise<UserSession | null> {
  // Try Supabase Auth token from Authorization header first
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (supabaseUrl && anonKey) {
      const supabase = deps.createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user) {
        // Validate user metadata structure
        if (!hasGitHubMetadata(user.user_metadata)) {
          return null;
        }

        // Convert to UserSession format for compatibility
        return {
          installationId: user.user_metadata.installationId,
          userLogin: user.user_metadata.githubLogin,
          userId: user.user_metadata.githubId,
          avatarUrl: user.user_metadata.avatarUrl,
          jwtToken: token,
          createdAt: new Date(user.created_at),
          expiresAt: new Date(), // Not used with Supabase tokens
        };
      }
    }
  }

  // Fallback to JWT token from cookie (legacy support for tests)
  const cookieToken = extractSessionToken(req.headers);
  if (cookieToken) {
    const session = validateSessionToken(cookieToken);
    if (session) {
      return session;
    }
  }

  return null;
}
