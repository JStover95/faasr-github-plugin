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
  JWT_SECRET: {
    name: 'JWT_SECRET',
    description: 'Secret for JWT token signing (minimum 32 characters)',
    required: true,
    minLength: 32,
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
      if (config.name === 'JWT_SECRET' && config.minLength) {
        if (value.length < config.minLength) {
          errors.push(
            `${config.name} must be at least ${config.minLength} characters long (currently ${value.length})`,
          );
        }
      }

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

