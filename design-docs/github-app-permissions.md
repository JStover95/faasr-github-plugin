# GitHub App Permissions

**Date**: 2025-01-27  
**Purpose**: Document required GitHub App permissions for FaaSr GitHub App MVP

## Required Permissions

The FaaSr GitHub App requires the following permissions to function correctly:

### Repository Permissions

#### `contents: write` (Required)

- **Purpose**: Create forks, commit files to repositories
- **Used for**:
  - Creating a fork of the FaaSr-workflow repository (FR-006)
  - Committing workflow JSON files to the user's fork (FR-007)
- **Scope**: Repository-level permission
- **Required by**: Repository fork creation and file upload functionality

#### `actions: write` (Required)

- **Purpose**: Trigger workflow_dispatch events
- **Used for**:
  - Triggering the FaaSr Register workflow after uploading a workflow file (FR-008)
- **Scope**: Repository-level permission
- **Required by**: Workflow registration functionality

#### `metadata: read` (Required)

- **Purpose**: Basic repository metadata access
- **Used for**:
  - Reading repository information
  - Checking fork status
  - Verifying repository existence
- **Scope**: Repository-level permission (always required by GitHub)
- **Required by**: All repository operations

## Permission Validation

The application validates that installations have the required permissions before proceeding with operations. This validation is performed:

1. **During Installation**: When a user installs the app, the callback endpoint validates that the installation has all required permissions (per FR-004)
2. **Before Operations**: Before performing repository operations, the app checks that permissions are still valid

## Implementation

Permission validation is implemented in:

- `supabase/functions/_shared/github-app.ts` - `validateInstallationPermissions()` function
- `supabase/functions/_shared/github-app.ts` - `checkInstallationPermissions()` function

## Error Handling

If an installation is missing required permissions:

- The installation callback will return an error
- Users will be prompted to reinstall the app with the correct permissions
- Error messages will indicate which permissions are missing

## References

- **FR-004**: GitHub App must validate required permissions during installation
- **FR-006**: Automatically fork FaaSr-workflow repository if fork doesn't exist
- **FR-007**: Commit workflow JSON files to user's fork
- **FR-008**: Trigger FaaSr Register workflow after file upload

## GitHub App Configuration

When creating the GitHub App in GitHub Settings, ensure the following permissions are requested:

```plaintext
Repository permissions:
  - Contents: Read and write
  - Actions: Read and write
  - Metadata: Read-only (always required)
```

## Notes

- All permissions are repository-level (not organization-level)
- Users can install the app on specific repositories or all repositories
- The app will validate permissions on each installation to ensure proper access
