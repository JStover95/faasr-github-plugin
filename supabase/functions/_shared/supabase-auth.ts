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
 * Create Supabase Admin client for server-side operations
 *
 * Uses SERVICE_ROLE_KEY for admin operations like creating users and sessions.
 * This client bypasses RLS and should only be used in edge functions.
 *
 * @returns Configured Supabase Admin client
 */
export function createSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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

  const regularClient = createClient(supabaseUrl, anonKey, {
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
 * Extract user session from request Authorization header
 *
 * Validates the Supabase Auth token and extracts user metadata.
 * Converts Supabase user format to UserSession format for compatibility.
 *
 * @param req - HTTP request object
 * @returns User session if valid, null otherwise
 */
export async function getUserFromRequest(
  req: Request
): Promise<UserSession | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    console.error(
      "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required"
    );
    return null;
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Convert to UserSession format for compatibility
  return {
    installationId: user.user_metadata.installationId as string,
    userLogin: user.user_metadata.githubLogin as string,
    userId: user.user_metadata.githubId as number,
    avatarUrl: user.user_metadata.avatarUrl as string | undefined,
    jwtToken: token,
    createdAt: new Date(user.created_at),
    expiresAt: new Date(), // Not used with Supabase tokens
  };
}
