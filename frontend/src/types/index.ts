/**
 * TypeScript type definitions for FaaSr GitHub App MVP Frontend
 *
 * These types match the backend types in supabase/functions/_shared/types.ts
 * and the API contract in specs/001-github-app-mvp/contracts/api.yaml
 */

/**
 * User Session - Represents an authenticated GitHub user session
 */
export interface UserSession {
  /** GitHub App installation ID after user installs the app */
  installationId: string;
  /** GitHub username/login */
  userLogin: string;
  /** GitHub user ID */
  userId: number;
  /** User's GitHub avatar URL */
  avatarUrl?: string;
  /** JWT session token (stored in HTTP-only cookie) */
  jwtToken: string;
  /** Session creation time */
  createdAt: Date;
  /** Session expiration time */
  expiresAt: Date;
}

/**
 * Repository Fork - Represents the user's fork of the FaaSr-workflow repository
 */
export interface RepositoryFork {
  /** GitHub username who owns the fork (same as userLogin) */
  owner: string;
  /** Repository name (always "FaaSr-workflow" for this use case) */
  repoName: string;
  /** Full GitHub URL to the fork */
  forkUrl: string;
  /** Status of fork operation */
  forkStatus: "pending" | "exists" | "created" | "failed";
  /** Default branch name (typically "main") */
  defaultBranch: string;
  /** When fork was created (if newly created) */
  createdAt?: Date;
}

/**
 * Workflow JSON File - Represents a FaaSr workflow configuration file
 */
export interface WorkflowJSONFile {
  /** Name of the workflow file (e.g., "my-workflow.json") */
  fileName: string;
  /** JSON content of the workflow file */
  fileContent: string | object;
  /** File size in bytes */
  fileSize: number;
  /** Status of upload/commit operation */
  uploadStatus: "pending" | "valid" | "invalid" | "committed" | "failed";
  /** Array of validation error messages */
  validationErrors?: string[];
  /** When file was uploaded */
  uploadedAt: Date;
  /** When file was committed to GitHub */
  committedAt?: Date;
}

/**
 * Workflow Registration - Represents the process of registering a workflow JSON file
 */
export interface WorkflowRegistration {
  /** Name of the workflow file being registered */
  workflowFileName: string;
  /** Status of registration workflow */
  registrationStatus: "pending" | "running" | "success" | "failed";
  /** GitHub Actions workflow run ID (if available) */
  workflowRunId?: number;
  /** URL to view workflow run in GitHub */
  workflowRunUrl?: string;
  /** Error message if registration failed */
  errorMessage?: string;
  /** When workflow dispatch was triggered */
  triggeredAt: Date;
  /** When registration workflow completed */
  completedAt?: Date;
}

/**
 * API Response Types
 */

export interface InstallationResponse {
  success: boolean;
  message: string;
  session?: {
    access_token: string;
    refresh_token: string;
  };
  user: UserInfo;
  fork: ForkInfo;
}

export interface SessionResponse {
  authenticated: boolean;
  user?: UserInfo;
  fork?: ForkInfo;
}

export interface UserInfo {
  login: string;
  id: number;
  avatarUrl: string;
}

export interface ForkInfo {
  owner: string;
  repoName: string;
  url: string;
  status: "pending" | "exists" | "created" | "failed";
}

export interface UploadResponse {
  success: boolean;
  message: string;
  fileName: string;
  commitSha: string;
  workflowRunId?: number;
  workflowRunUrl?: string;
}

export interface WorkflowStatusResponse {
  fileName: string;
  status: "pending" | "running" | "success" | "failed";
  workflowRunId?: number;
  workflowRunUrl?: string;
  errorMessage?: string;
  triggeredAt: string;
  completedAt?: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  details?: string[];
}

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  version: string;
}
