/**
 * Shared dependencies for Supabase Edge Functions
 *
 * This file centralizes imports of external packages used across Edge Functions.
 * All @octokit packages are imported via npm: specifier for Deno compatibility.
 */

// GitHub App authentication
export { App } from 'npm:@octokit/app@16.1.2';

// GitHub REST API client
export { Octokit } from 'npm:@octokit/rest@22.0.1';

// JWT signing for GitHub App authentication
export * as jwt from 'npm:jsonwebtoken@^9.0.2';
