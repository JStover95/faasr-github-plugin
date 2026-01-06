/**
 * Authentication Edge Function
 *
 * Handles GitHub App installation and session management:
 * - GET /auth/install - Redirects to GitHub App installation page
 * - GET /auth/callback - Handles installation callback, creates fork, establishes session
 * - GET /auth/session - Returns current session status
 * - POST /auth/logout - Logs out current session
 */

import { getCorsHeaders } from "../_shared/cors.ts";
import {
  checkInstallationPermissions,
  getInstallation,
  getInstallationToken,
} from "../_shared/github-app.ts";
import {
  createLogoutCookie,
  createSessionCookie,
  createSessionToken,
  getSessionFromRequest,
} from "../_shared/auth.ts";
import { ensureForkExists } from "../_shared/repository.ts";
import { validateEnvironmentOnStartup } from "../_shared/env-validation.ts";
import { Octokit } from "../_shared/deps.ts";
import type { UserSession } from "../_shared/types.ts";

/**
 * Services object for dependency injection and testing
 * This allows functions to be stubbed in tests
 */
export const deps = {
  getInstallation,
  checkInstallationPermissions,
  getInstallationToken,
  ensureForkExists,
  createSessionToken,
  createSessionCookie,
};

/**
 * Handle GET /auth/install - Initiate GitHub App installation
 */
export function handleInstall(req: Request): Response {
  const corsHeaders = getCorsHeaders(req);
  const clientId = Deno.env.get("GITHUB_CLIENT_ID");
  if (!clientId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "GitHub App client ID not configured",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Build GitHub App installation URL
  const githubInstallUrl = new URL(
    "https://github.com/apps/faasr/installations/new"
  );
  githubInstallUrl.searchParams.set("state", "install");

  // Redirect to GitHub App installation page
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: githubInstallUrl.toString(),
    },
  });
}

/**
 * Handle GET /auth/callback - Handle GitHub App installation callback
 */
export async function handleCallback(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  try {
    const url = new URL(req.url);
    const installationId = url.searchParams.get("installation_id");

    if (!installationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing installation_id parameter",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const appId = Deno.env.get("GITHUB_APP_ID");
    const privateKey = Deno.env.get("GITHUB_PRIVATE_KEY");

    if (!appId || !privateKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GitHub App configuration missing",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get installation information
    const installation = await deps.getInstallation(
      appId,
      privateKey,
      installationId
    );

    // Validate permissions
    const permissionCheck = await deps.checkInstallationPermissions(
      appId,
      privateKey,
      installationId
    );

    if (!permissionCheck.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required permissions",
          details: permissionCheck.missingPermissions,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get installation token for API operations
    const { token } = await deps.getInstallationToken(
      appId,
      privateKey,
      installationId
    );
    const octokit = new Octokit({ auth: token });

    // Ensure fork exists
    const fork = await deps.ensureForkExists(
      octokit,
      installation.account.login
    );

    // Create session
    const sessionData: Omit<
      UserSession,
      "jwtToken" | "createdAt" | "expiresAt"
    > = {
      installationId,
      userLogin: installation.account.login,
      userId: installation.account.id,
      avatarUrl: installation.account.avatar_url,
    };

    const sessionToken = deps.createSessionToken(sessionData);
    const cookie = deps.createSessionCookie(sessionToken);

    // Return success response with session cookie
    return new Response(
      JSON.stringify({
        success: true,
        message: "Installation successful",
        user: {
          login: installation.account.login,
          id: installation.account.id,
          avatarUrl: installation.account.avatar_url,
        },
        fork: {
          owner: fork.owner,
          repoName: fork.repoName,
          url: fork.forkUrl,
          status: fork.forkStatus,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (error) {
    console.error("Callback error:", error);

    // Provide user-friendly error messages
    let errorMessage = "Installation failed";
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        errorMessage = "Too many requests. Please try again in a few minutes.";
      } else if (error.message.includes("permission")) {
        errorMessage =
          "The app needs additional permissions. Please reinstall.";
      } else if (error.message.includes("not found")) {
        errorMessage = "Fork not found. Please try installing again.";
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle GET /auth/session - Get current session status
 */
export function handleGetSession(req: Request): Response {
  const corsHeaders = getCorsHeaders(req);
  const session = getSessionFromRequest(req);

  if (!session) {
    return new Response(
      JSON.stringify({
        authenticated: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      user: {
        login: session.userLogin,
        id: session.userId,
        avatarUrl: session.avatarUrl,
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Handle POST /auth/logout - Log out current session
 */
export function handleLogout(req: Request): Response {
  const corsHeaders = getCorsHeaders(req);
  const logoutCookie = createLogoutCookie();

  return new Response(
    JSON.stringify({
      success: true,
      message: "Logged out successfully",
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Set-Cookie": logoutCookie,
      },
    }
  );
}

/**
 * Main Edge Function handler
 */
if (import.meta.main) {
  // Validate environment variables on module load (once per Edge Function instance)
  try {
    validateEnvironmentOnStartup();
  } catch (error) {
    console.error("Environment validation failed:", error);
    // Don't throw here - let individual handlers handle missing env vars gracefully
  }

  Deno.serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);
    // Extract path after /functions/v1
    const pathMatch = url.pathname.match(/\/functions\/v1(\/.*)$/);
    const path = pathMatch ? pathMatch[1] : url.pathname;

    try {
      // Route to appropriate handler
      if (path === "/auth/install" && req.method === "GET") {
        return handleInstall(req);
      } else if (path === "/auth/callback" && req.method === "GET") {
        return await handleCallback(req);
      } else if (path === "/auth/session" && req.method === "GET") {
        return handleGetSession(req);
      } else if (path === "/auth/logout" && req.method === "POST") {
        return handleLogout(req);
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Not found",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } catch (error) {
      console.error("Edge Function error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Internal server error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  });
}
