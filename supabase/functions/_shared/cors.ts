/**
 * CORS headers utility
 *
 * Provides CORS headers for Supabase Edge Functions
 * Configured via environment variables with secure defaults
 *
 * Environment variables:
 * - CORS_ALLOW_ORIGIN: Comma-separated list of allowed origins (e.g., "http://localhost:3000,https://example.com")
 *   or "*" for wildcard (default: "*")
 * - CORS_ALLOW_CREDENTIALS: "true" or "false" (default: "false")
 *   Note: If true, CORS_ALLOW_ORIGIN cannot be "*"
 * - CORS_ALLOW_HEADERS: Comma-separated list of allowed headers (default: "authorization, x-client-info, apikey, content-type")
 * - CORS_ALLOW_METHODS: Comma-separated list of allowed methods (default: "GET, POST, PUT, DELETE, OPTIONS")
 */

/**
 * Parse comma-separated environment variable into array
 */
function parseEnvList(
  envValue: string | undefined,
  defaultValue: string
): string[] {
  if (!envValue) {
    return defaultValue.split(",").map((s) => s.trim());
  }
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Get CORS configuration from environment variables with secure defaults
 */
function getCorsConfig() {
  const allowOriginEnv = Deno.env.get("CORS_ALLOW_ORIGIN");
  const allowCredentialsEnv = Deno.env.get("CORS_ALLOW_CREDENTIALS");
  const allowHeadersEnv = Deno.env.get("CORS_ALLOW_HEADERS");
  const allowMethodsEnv = Deno.env.get("CORS_ALLOW_METHODS");

  // Default: no credentials, wildcard origin
  const allowCredentials = allowCredentialsEnv?.toLowerCase() === "true";
  const allowedOrigins = allowOriginEnv
    ? parseEnvList(allowOriginEnv, "")
    : ["*"];
  const allowedHeaders = parseEnvList(
    allowHeadersEnv,
    "authorization, x-client-info, apikey, content-type"
  );
  const allowedMethods = parseEnvList(
    allowMethodsEnv,
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  // Security check: if credentials are enabled, cannot use wildcard origin
  if (allowCredentials && allowedOrigins.includes("*")) {
    console.warn(
      "CORS_ALLOW_CREDENTIALS is true but CORS_ALLOW_ORIGIN includes '*'. " +
        "Wildcard origins are not allowed with credentials. " +
        "Please specify explicit origins in CORS_ALLOW_ORIGIN."
    );
  }

  return {
    allowedOrigins,
    allowCredentials,
    allowedHeaders,
    allowedMethods,
  };
}

/**
 * Check if a request origin is allowed
 */
function isOriginAllowed(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) {
    return false;
  }

  // Wildcard allows all origins
  if (allowedOrigins.includes("*")) {
    return true;
  }

  // Check exact match
  return allowedOrigins.includes(origin);
}

/**
 * Get the allowed origin value for a request
 * Returns the origin value to use in the Access-Control-Allow-Origin header
 */
function getAllowedOriginValue(
  origin: string | null,
  allowedOrigins: string[],
  allowCredentials: boolean
): string | null {
  // If wildcard is allowed and credentials are disabled, use wildcard
  if (allowedOrigins.includes("*") && !allowCredentials) {
    return "*";
  }

  // If origin is allowed, return it (required for credentials or when using specific origins)
  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    return origin;
  }

  // If wildcard is allowed (even with credentials - though this will fail in browser)
  // Still return it as the user has configured it this way
  if (allowedOrigins.includes("*")) {
    return "*";
  }

  // No matching origin - return null (caller should handle this appropriately)
  return null;
}

/**
 * Generate CORS headers based on configuration and request
 *
 * When credentials are included in requests, browsers require:
 * - A specific origin (not wildcard) in Access-Control-Allow-Origin
 * - Access-Control-Allow-Credentials: true
 *
 * @param request - The incoming request to extract origin from
 * @returns CORS headers object
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const config = getCorsConfig();
  const origin = request.headers.get("Origin");
  const allowedOriginValue = getAllowedOriginValue(
    origin,
    config.allowedOrigins,
    config.allowCredentials
  );

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": config.allowedHeaders.join(", "),
    "Access-Control-Allow-Methods": config.allowedMethods.join(", "),
  };

  // Set origin header
  if (allowedOriginValue !== null) {
    headers["Access-Control-Allow-Origin"] = allowedOriginValue;
  } else {
    // If no origin matches and wildcard is not allowed, the browser will reject the request
    // This is the secure default behavior
    console.warn(
      `CORS: Request origin "${origin}" is not in allowed origins list. ` +
        `Allowed origins: ${config.allowedOrigins.join(", ")}. ` +
        `Request will be rejected by the browser.`
    );
    // Don't set Access-Control-Allow-Origin header - browser will reject the request
    // This is the most secure behavior when origin doesn't match
  }

  // Set credentials header if enabled
  if (config.allowCredentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}
