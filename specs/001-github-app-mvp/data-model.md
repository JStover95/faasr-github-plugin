# Data Model: FaaSr GitHub App MVP

**Date**: 2025-01-27  
**Purpose**: Define entities, relationships, and validation rules for the FaaSr GitHub App MVP

## Entities

### 1. User Session

**Description**: Represents an authenticated GitHub user session. For PoC, state does not persist between sessions.

**Attributes**:

- `installationId` (string, required): GitHub App installation ID after user installs the app
- `userLogin` (string, required): GitHub username/login
- `userId` (number, required): GitHub user ID
- `avatarUrl` (string, optional): User's GitHub avatar URL
- `jwtToken` (string, required): JWT session token (stored in HTTP-only cookie)
- `createdAt` (timestamp, required): Session creation time
- `expiresAt` (timestamp, required): Session expiration time

**State Transitions**:

- `unauthenticated` → `authenticating` → `authenticated` → `expired`/`logged_out`

**Validation Rules**:

- `installationId` must be a valid GitHub installation ID (numeric string)
- `userLogin` must match GitHub username format (alphanumeric, hyphens, no spaces)
- For PoC: Sessions are managed in-memory and automatically expire on page reload (no persistent storage)

**Storage**: JWT token stored in HTTP-only cookie (client-side), session data in-memory (Supabase Edge Function runtime)

---

### 2. Repository Fork

**Description**: Represents the user's fork of the FaaSr-workflow repository.

**Attributes**:

- `owner` (string, required): GitHub username who owns the fork (same as userLogin)
- `repoName` (string, required): Repository name (always "FaaSr-workflow" for this use case)
- `forkUrl` (string, required): Full GitHub URL to the fork (e.g., `https://github.com/{userLogin}/FaaSr-workflow`)
- `forkStatus` (enum, required): Status of fork operation
  - `pending`: Fork creation in progress
  - `exists`: Fork already exists (detected)
  - `created`: Fork successfully created
  - `failed`: Fork creation failed
- `defaultBranch` (string, required): Default branch name (typically "main")
- `createdAt` (timestamp, optional): When fork was created (if newly created)

**State Transitions**:

- `pending` → `created` (success)
- `pending` → `failed` (error)
- `exists` (fork already present, no transition needed)

**Validation Rules**:

- `owner` must match authenticated user's login
- `repoName` must be "FaaSr-workflow"
- `forkUrl` must be valid GitHub repository URL format

**Relationships**:

- Belongs to: User Session (via `owner` = `userLogin`)

**Storage**: Derived from GitHub API, cached in session during active session

---

### 3. Workflow JSON File

**Description**: Represents a FaaSr workflow configuration file uploaded by the user.

**Attributes**:

- `fileName` (string, required): Name of the workflow file (e.g., "my-workflow.json")
- `fileContent` (string/object, required): JSON content of the workflow file
- `fileSize` (number, required): File size in bytes
- `uploadStatus` (enum, required): Status of upload/commit operation
  - `pending`: File uploaded, validation in progress
  - `valid`: File validated successfully
  - `invalid`: File validation failed (malformed JSON)
  - `committed`: File committed to GitHub repository
  - `failed`: Commit operation failed
- `validationErrors` (array, optional): Array of validation error messages
- `uploadedAt` (timestamp, required): When file was uploaded
- `committedAt` (timestamp, optional): When file was committed to GitHub

**State Transitions**:

- `pending` → `valid` → `committed` (success path)
- `pending` → `invalid` (validation failure)
- `valid` → `failed` (commit failure)

**Validation Rules**:

- `fileName` must:
  - End with `.json` extension
  - Not contain path separators (`/`, `\`)
  - Not be empty
  - Match pattern: `^[a-zA-Z0-9_-]+\.json$`
- `fileContent` must:
  - Be valid JSON (parseable)
  - Not exceed reasonable size limit (e.g., 1MB for PoC)
  - Contain required FaaSr workflow structure (structural validation deferred to FaaSr Register workflow)

**Relationships**:

- Belongs to: User Session (uploaded by authenticated user)
- Committed to: Repository Fork (committed to user's fork)

**Storage**: File content parsed from FormData in Supabase Edge Function (no temporary storage), immediately committed to GitHub repository

---

### 4. Workflow Registration

**Description**: Represents the process of registering a workflow JSON file via the FaaSr Register GitHub workflow.

**Attributes**:

- `workflowFileName` (string, required): Name of the workflow file being registered (matches Workflow JSON File `fileName`)
- `registrationStatus` (enum, required): Status of registration workflow
  - `pending`: Workflow dispatch triggered, waiting for execution
  - `running`: FaaSr Register workflow is executing
  - `success`: Registration completed successfully
  - `failed`: Registration workflow failed
- `workflowRunId` (number, optional): GitHub Actions workflow run ID (if available)
- `workflowRunUrl` (string, optional): URL to view workflow run in GitHub
- `errorMessage` (string, optional): Error message if registration failed
- `triggeredAt` (timestamp, required): When workflow dispatch was triggered
- `completedAt` (timestamp, optional): When registration workflow completed

**State Transitions**:

- `pending` → `running` → `success` (success path)
- `pending` → `running` → `failed` (failure path)
- `pending` → `failed` (immediate failure, e.g., invalid workflow file name)

**Validation Rules**:

- `workflowFileName` must match a committed Workflow JSON File `fileName`
- Workflow dispatch can only be triggered after file is committed

**Relationships**:

- Triggered by: Workflow JSON File (after successful commit)
- Executes in: Repository Fork (runs in user's fork)

**Storage**: Status tracked in session, workflow execution tracked via GitHub API

---

## Relationships Summary

```plaintext
User Session (1) ──< (many) Workflow JSON Files
     │
     │ (1:1)
     │
     v
Repository Fork (1) ──< (many) Workflow JSON Files (committed)
     │
     │ (1:many)
     │
     v
Workflow Registrations (triggered for each committed file)
```

## Data Flow

1. **Installation Flow**:
   - User authenticates → User Session created with `installationId`
   - System checks for existing fork → Repository Fork entity created/updated
   - Fork created if needed → Repository Fork status updated

2. **Upload Flow**:
   - User uploads file → Workflow JSON File created with `pending` status
   - File validated → Status updated to `valid` or `invalid`
   - File committed to fork → Status updated to `committed`, Repository Fork updated
   - Workflow dispatch triggered → Workflow Registration created with `pending` status

3. **Registration Flow**:
   - Workflow Registration status polled/updated via GitHub API
   - Status transitions based on workflow run results

## Validation Rules Summary

### File Upload Validation

- File extension must be `.json`
- File must be valid JSON syntax
- File name must be safe (no path traversal)
- File size within limits

### GitHub API Validation

- Installation ID must be valid and active
- Repository must exist and be accessible
- User must have necessary permissions
- Workflow file must exist in repository before dispatch

## Notes for Implementation

- **Session Management**: All entities except committed files are session-scoped. No database persistence required for PoC.
- **Error Handling**: Validation errors should be user-friendly and actionable.
- **State Consistency**: Workflow Registration status should be checked via GitHub API, not assumed.
- **Idempotency**: Fork creation should check for existing fork before creating (per FR-006).
