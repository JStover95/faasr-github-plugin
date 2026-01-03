/**
 * Application constants
 *
 * Centralizes all environment variable access to make testing easier
 */

/**
 * Base URL for API endpoints
 * In production, this should be set via environment variable VITE_API_BASE_URL
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:54321/functions/v1";
