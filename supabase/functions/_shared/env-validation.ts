/**
 * Environment variable validation utility for Edge Functions
 *
 * Validates required environment variables on Edge Function startup
 * and provides helpful error messages if any are missing.
 */

/**
 * Required environment variables for Edge Functions
 */
const REQUIRED_ENV_VARS = {
  GITHUB_APP_ID: {
    name: 'GITHUB_APP_ID',
    description: 'GitHub App ID from app settings',
    required: true,
  },
  GITHUB_CLIENT_ID: {
    name: 'GITHUB_CLIENT_ID',
    description: 'GitHub App Client ID',
    required: true,
  },
  GITHUB_CLIENT_SECRET: {
    name: 'GITHUB_CLIENT_SECRET',
    description: 'GitHub App Client Secret',
    required: true,
  },
  GITHUB_PRIVATE_KEY: {
    name: 'GITHUB_PRIVATE_KEY',
    description: 'GitHub App Private Key (PEM format)',
    required: true,
  },
  SUPABASE_URL: {
    name: 'SUPABASE_URL',
    description: 'Supabase project URL',
    required: true,
  },
  SUPABASE_ANON_KEY: {
    name: 'SUPABASE_ANON_KEY',
    description: 'Supabase anonymous key for client operations',
    required: true,
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key for admin operations',
    required: true,
  },
} as const;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variables
 *
 * @returns Validation result with any errors or warnings found
 */
export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = Deno.env.get(key);

    if (!value) {
      if (config.required) {
        errors.push(
          `Missing required environment variable: ${config.name} (${config.description})`,
        );
      }
    } else {
      // Validate specific requirements
      if (config.name === 'GITHUB_PRIVATE_KEY') {
        // Basic validation for PEM format
        if (!value.includes('BEGIN') || !value.includes('PRIVATE KEY')) {
          warnings.push(
            `${config.name} may not be in correct PEM format. Expected format: -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----`,
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment variables and return formatted error message
 *
 * @returns Error message if validation fails, null otherwise
 */
export function getEnvironmentValidationError(): string | null {
  const result = validateEnvironmentVariables();

  if (result.valid) {
    // Log warnings if any
    if (result.warnings.length > 0) {
      console.warn('Environment variable warnings:', result.warnings);
    }
    return null;
  }

  const messages: string[] = [
    'Environment variable validation failed:',
    ...result.errors,
  ];

  if (result.warnings.length > 0) {
    messages.push('', 'Warnings:', ...result.warnings);
  }

  return messages.join('\n');
}

/**
 * Validate environment variables on Edge Function startup
 *
 * Should be called at the beginning of Edge Function handlers.
 * Throws an error if validation fails.
 *
 * @throws Error if required environment variables are missing or invalid
 */
export function validateEnvironmentOnStartup(): void {
  const error = getEnvironmentValidationError();
  if (error) {
    throw new Error(error);
  }
}

