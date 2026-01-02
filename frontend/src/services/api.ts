/**
 * API client service for communicating with Supabase Edge Functions
 *
 * Provides functions for:
 * - Authentication endpoints
 * - Workflow upload and status endpoints
 * - Health check endpoint
 */

import type {
  InstallationResponse,
  SessionResponse,
  UploadResponse,
  WorkflowStatusResponse,
  SuccessResponse,
  ErrorResponse,
  HealthResponse,
} from "../types";

/**
 * Base URL for API endpoints
 * In production, this should be set via environment variable
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:54321/functions/v1";

/**
 * Default fetch options with credentials for cookie handling
 */
const defaultFetchOptions: RequestInit = {
  credentials: "include", // Include cookies in requests
  headers: {
    "Content-Type": "application/json",
  },
};

/**
 * Handle API response and parse JSON
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ErrorResponse = await response.json().catch(() => ({
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Initiate GitHub App installation
   * Redirects to GitHub App installation page
   */
  async install(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/install`, {
      ...defaultFetchOptions,
      method: "GET",
      redirect: "manual", // Don't follow redirect automatically
    });

    if (response.status === 302) {
      // Redirect to GitHub
      const location = response.headers.get("Location");
      if (location) {
        window.location.href = location;
      }
    } else {
      throw new Error("Failed to initiate installation");
    }
  },

  /**
   * Handle installation callback
   * Called after GitHub redirects back with installation info
   */
  async callback(
    installationId: string,
    setupAction?: string
  ): Promise<InstallationResponse> {
    const params = new URLSearchParams({
      installation_id: installationId,
    });
    if (setupAction) {
      params.append("setup_action", setupAction);
    }

    const response = await fetch(
      `${API_BASE_URL}/auth/callback?${params.toString()}`,
      {
        ...defaultFetchOptions,
        method: "GET",
      }
    );

    return handleResponse<InstallationResponse>(response);
  },

  /**
   * Get current session status
   */
  async getSession(): Promise<SessionResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/session`, {
      ...defaultFetchOptions,
      method: "GET",
    });

    return handleResponse<SessionResponse>(response);
  },

  /**
   * Log out current session
   */
  async logout(): Promise<SuccessResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      ...defaultFetchOptions,
      method: "POST",
    });

    return handleResponse<SuccessResponse>(response);
  },
};

/**
 * Workflows API
 */
export const workflowsApi = {
  /**
   * Upload and register workflow JSON file
   */
  async upload(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/workflows/upload`, {
      credentials: "include", // Include cookies in requests
      method: "POST",
      // Don't set Content-Type header for FormData - browser will set it with boundary
      body: formData,
    });

    return handleResponse<UploadResponse>(response);
  },

  /**
   * Get workflow registration status
   */
  async getStatus(fileName: string): Promise<WorkflowStatusResponse> {
    const response = await fetch(
      `${API_BASE_URL}/workflows/status/${encodeURIComponent(fileName)}`,
      {
        ...defaultFetchOptions,
        method: "GET",
      }
    );

    return handleResponse<WorkflowStatusResponse>(response);
  },
};

/**
 * Health API
 */
export const healthApi = {
  /**
   * Check API health status
   */
  async check(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`, {
      ...defaultFetchOptions,
      method: "GET",
    });

    return handleResponse<HealthResponse>(response);
  },
};

/**
 * Default API export with all endpoints
 */
export default {
  auth: authApi,
  workflows: workflowsApi,
  health: healthApi,
};
