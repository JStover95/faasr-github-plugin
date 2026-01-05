/**
 * Environment variable validation utility
 *
 * Validates required environment variables on application startup
 * and provides helpful error messages if any are missing.
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Required environment variables for the frontend application
 */
const REQUIRED_ENV_VARS = {
  VITE_API_BASE_URL: {
    name: 'VITE_API_BASE_URL',
    description: 'Base URL for Supabase Edge Functions API',
    required: false, // Has default value
  },
} as const;

/**
 * Validate environment variables
 *
 * @returns Validation result with any errors found
 */
export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];

  // Check required variables
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    if (config.required && !import.meta.env[key]) {
      errors.push(
        `Missing required environment variable: ${key} (${config.description})`,
      );
    }
  }

  // Validate API_BASE_URL format if provided
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl) {
    try {
      new URL(apiBaseUrl);
    } catch {
      errors.push(
        `Invalid VITE_API_BASE_URL format. Must be a valid URL (e.g., https://your-project.supabase.co/functions/v1)`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate and log environment variable errors
 *
 * Should be called on application startup.
 * In development, logs warnings. In production, throws errors.
 *
 * @throws Error in production if validation fails
 */
export function validateEnvironmentOnStartup(): void {
  const result = validateEnvironmentVariables();

  if (!result.valid) {
    const errorMessage = `Environment variable validation failed:\n${result.errors.join('\n')}`;

    if (import.meta.env.DEV) {
      // In development, log warnings but don't throw
      console.warn('⚠️ Environment variable warnings:', errorMessage);
      console.warn(
        '⚠️ Some features may not work correctly. Please check your .env file.',
      );
    } else {
      // In production, throw error to prevent app from running with invalid config
      throw new Error(errorMessage);
    }
  }
}

