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
import { API_BASE_URL } from "../constants";

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
 * Format user-friendly error message from API response
 *
 * @param status - HTTP status code
 * @param errorMessage - Error message from API
 * @returns User-friendly error message
 */
function formatApiErrorMessage(status: number, errorMessage?: string): string {
  // Use API error message if available and user-friendly
  if (errorMessage) {
    return errorMessage;
  }

  // Provide default messages based on status code
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please log in and try again.';
    case 403:
      return 'Permission denied. Please check your GitHub App permissions.';
    case 404:
      return 'Resource not found. Please verify the file or workflow exists.';
    case 429:
      return 'Too many requests. Please wait a few minutes and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server error. Please try again in a few minutes.';
    default:
      return `Request failed (${status}). Please try again.`;
  }
}

/**
 * Handle API response and parse JSON
 *
 * Provides comprehensive error handling with user-friendly messages for:
 * - Network failures (connection errors, timeouts)
 * - HTTP errors (4xx, 5xx status codes)
 * - JSON parsing errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage: string;
    try {
      const error: ErrorResponse = await response.json();
      errorMessage = formatApiErrorMessage(
        response.status,
        error.error,
      );
    } catch {
      // If JSON parsing fails, use status-based message
      errorMessage = formatApiErrorMessage(response.status);
    }

    // Create error with user-friendly message
    const error = new Error(errorMessage);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(
      'Invalid response from server. Please try again or contact support.',
    );
  }
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
      } else {
        throw new Error("Failed to initiate installation");
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
