# Research: FaaSr GitHub App MVP

**Date**: 2025-01-27  
**Purpose**: Resolve technical clarifications for implementation planning

## Backend Language & Framework

### Decision: Supabase Edge Functions (Deno/TypeScript)

**Rationale**:

- Serverless architecture: No server management, auto-scaling, pay-per-use
- Deno runtime: Modern, secure, TypeScript-first (no build step needed)
- Supabase integration: Simple secret management via dashboard, built-in deployment
- TypeScript support: Enables code sharing of types with frontend
- Strong ecosystem: @octokit packages work with Deno (via npm: specifier)
- Simplified deployment: `supabase functions deploy` handles infrastructure
- Cost-effective for PoC: Free tier available, scales to zero when idle

**Alternatives Considered**:

- **Express.js**: Traditional server requires hosting management and always-on costs. More complex deployment for PoC.
- **AWS Lambda**: More complex setup, AWS-specific knowledge required, more verbose secret management.
- **Python (FastAPI)**: Would require maintaining two language ecosystems. Type safety needs additional tooling.

## Testing Framework

### Decision: Jest for Backend, Jest + React Testing Library for Frontend

**Rationale**:

- Jest is the standard testing framework for Node.js/TypeScript projects
- React Testing Library is the recommended approach for testing React components (focuses on user behavior, not implementation)
- Single testing framework (Jest) across frontend and backend simplifies configuration
- Excellent TypeScript support and mocking capabilities
- Widely adopted in React/TypeScript ecosystem

**Alternatives Considered**:

- **Vitest**: Modern alternative to Jest, but less mature ecosystem and fewer examples
- **Mocha + Chai**: More flexible but requires more configuration. Jest provides better out-of-the-box experience.

## GitHub App Integration Patterns

### Decision: Use @octokit/app and @octokit/rest for GitHub App integration

**Rationale**:

- `@octokit/app` provides GitHub App authentication (JWT generation, installation token management)
- `@octokit/rest` provides comprehensive GitHub API client
- Official GitHub-maintained packages with excellent TypeScript support
- Handles authentication complexity (JWT signing, token refresh)
- Well-documented with examples

**Key Patterns**:

1. **App Authentication**: Use JWT to authenticate as the GitHub App
   - Generate JWT using app private key (stored as Supabase Edge Function secret)
   - JWT expires after 10 minutes, must be regenerated
   - Secrets accessed via `Deno.env.get('GITHUB_PRIVATE_KEY')` in Edge Functions

2. **Installation Authentication**: Get installation tokens for user-specific actions
   - When user installs app, GitHub provides installation ID
   - Use installation ID to get installation token
   - Installation tokens have permissions scoped to what user granted during installation

3. **Required Permissions** (GitHub App):
   - `contents: write` - To create forks, commit files
   - `actions: write` - To trigger workflow_dispatch events
   - `metadata: read` - Basic repository metadata (always required)

4. **Installation Flow**:
   - User clicks "Install FaaSr" → Redirect to GitHub App installation page
   - User selects repositories/account → GitHub redirects back with installation ID
   - Backend stores installation ID (session storage for PoC)
   - Use installation ID to get tokens for API calls

**Alternatives Considered**:

- **Direct OAuth App**: Simpler but less secure. GitHub Apps provide better permission scoping and installation management.
- **Manual JWT/API calls**: More control but significantly more complexity. @octokit packages handle edge cases and best practices.

## Storage Strategy

### Decision: Session-based storage (in-memory or encrypted cookies)

**Rationale**:

- Per spec: "State does not persist between sessions"
- No database required for PoC scope
- Session storage sufficient for:
  - GitHub installation ID
  - User authentication state
  - Temporary file uploads (before committing to GitHub)

**Implementation**:

- Stateless sessions: Use encrypted JWT tokens stored in HTTP-only cookies (client-side)
- Store installation ID and user info in JWT token payload
- File uploads: Receive file as multipart/form-data in Edge Function, parse using Deno's built-in FormData API, commit to GitHub immediately
- No server-side session store needed (stateless architecture)

**Alternatives Considered**:

- **Database (PostgreSQL/MongoDB)**: Overkill for PoC. Adds complexity without providing value for single-session use case.
- **Redis**: Useful for production but unnecessary for PoC where sessions don't persist.

## File Upload & Validation

### Decision: Client-side JSON validation + server-side validation before commit

**Rationale**:

- Immediate user feedback on invalid JSON (client-side)
- Server-side validation ensures security and prevents malformed commits
- Use `JSON.parse()` for basic validation
- Consider `jsonschema` library for structural validation if needed (defer to Phase 2 if not critical)

**Implementation**:

- Frontend: Validate JSON syntax on file selection
- Backend: Re-validate before committing to GitHub
- Error handling: Clear error messages for malformed JSON

## Workflow Trigger Pattern

### Decision: Use GitHub API `workflows.createWorkflowDispatch` endpoint

**Rationale**:

- Direct API call to trigger workflow_dispatch event
- No need for webhook handling (workflow runs automatically)
- Can pass workflow file name as input parameter
- Simpler than polling or webhook-based approaches

**Implementation**:

```typescript
await octokit.rest.actions.createWorkflowDispatch({
  owner: userLogin,
  repo: 'FaaSr-workflow',
  workflow_id: 'register-workflow.yml',
  ref: 'main',
  inputs: {
    workflow_file: fileName
  }
});
```

## Error Handling Strategy

### Decision: User-friendly error messages with GitHub API error context

**Rationale**:

- GitHub API errors are often technical (rate limits, permissions)
- Transform to user-friendly messages
- Log technical details server-side for debugging
- Display actionable guidance to users

**Common Error Scenarios**:

- Rate limit exceeded → "Too many requests. Please try again in a few minutes."
- Permission denied → "The app needs additional permissions. Please reinstall."
- Repository not found → "Fork not found. Please try installing again."
- Invalid JSON → "The workflow file is invalid. Please check the JSON format."

## Security Considerations

### Decision: Supabase Edge Function secrets, HTTPS by default

**Rationale**:

- GitHub App private key must be kept secure
- Supabase Edge Functions provide encrypted secret storage
- Secrets managed via Supabase Dashboard (no code exposure)
- HTTPS enforced by Supabase infrastructure
- JWT tokens in httpOnly cookies for session management
- No sensitive data in client-side code

**Implementation**:

- Set secrets via Supabase Dashboard: `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Access secrets in Edge Functions: `Deno.env.get('GITHUB_PRIVATE_KEY')`
- For local development: Use `supabase secrets set` or `.env.local` file (gitignored)
- Never expose private key or secrets to frontend

## Summary

All technical clarifications resolved:

- ✅ Backend: Supabase Edge Functions (Deno/TypeScript)
- ✅ Testing: Deno test (backend) + Jest + React Testing Library (frontend)
- ✅ GitHub Integration: @octokit/app + @octokit/rest (via npm: specifier in Deno)
- ✅ Storage: Stateless JWT tokens (HTTP-only cookies)
- ✅ File handling: FormData parsing in Edge Function, immediate GitHub commit
- ✅ Workflow trigger: Direct API call to workflow_dispatch endpoint
- ✅ Secrets: Supabase Edge Function secrets (dashboard-managed)
