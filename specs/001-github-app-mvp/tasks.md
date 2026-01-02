# Tasks: FaaSr GitHub App MVP

**Feature Branch**: `001-github-app-mvp`  
**Date**: 2025-01-27  
**Status**: Ready for Implementation

## Summary

This document breaks down the implementation of the FaaSr GitHub App MVP into actionable, dependency-ordered tasks organized by user story. Each phase includes tasks categorized into Mocks, Tests, and Implementation.

**Total Tasks**: 81  
**User Story 1 Tasks**: 28  
**User Story 2 Tasks**: 32  
**Setup & Foundational Tasks**: 16  
**Polish Tasks**: 5

## Implementation Strategy

**MVP Scope**: User Story 1 (Install FaaSr and Authenticate) delivers the foundational functionality that enables all subsequent features. User Story 2 (Upload and Register Workflow) builds on this foundation.

**Incremental Delivery**:

1. Complete Phase 1 (Setup) and Phase 2 (Foundational) to establish project structure
2. Implement User Story 1 to deliver authentication and repository forking
3. Implement User Story 2 to deliver workflow upload and registration
4. Complete Polish phase for production readiness

**Parallel Opportunities**: Tasks marked with `[P]` can be executed in parallel as they work on different files with no dependencies on incomplete tasks.

## Dependencies

```plaintext
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
Phase 3 (User Story 1: Install & Authenticate)
    ↓
Phase 4 (User Story 2: Upload & Register Workflow)
    ↓
Phase 5 (Polish)
```

**User Story Independence**: User Story 2 depends on User Story 1 completion (requires authentication and fork to exist).

## Phase 1: Setup

**Goal**: Initialize project structure, configure development environment, and set up foundational tooling.

**Mocks:** N/A

**Tests:** N/A

**Implementation:**

- [ ] T001 Create Supabase project structure in `supabase/functions/`
- [ ] T002 Create Supabase Edge Function directories: `supabase/functions/auth/`, `supabase/functions/workflows/`, `supabase/functions/health/`
- [ ] T003 Create shared utilities directory: `supabase/functions/_shared/`
- [ ] T004 Create frontend project structure in `frontend/` with React + TypeScript setup
- [ ] T005 Initialize frontend package.json with dependencies: React 19.x, TypeScript 5.x, React Router, React Testing Library, Jest
- [ ] T006 Create frontend source directories: `frontend/src/components/`, `frontend/src/pages/`, `frontend/src/services/`, `frontend/src/hooks/`, `frontend/src/types/`
- [ ] T007 Create frontend test directory: `frontend/tests/unit/`
- [ ] T008 Create Supabase config file: `supabase/config.toml`
- [ ] T009 Create frontend `.env.example` file with placeholder environment variables
- [ ] T010 Create project README.md with setup instructions

## Phase 2: Foundational

**Goal**: Implement shared utilities, type definitions, and core infrastructure that all user stories depend on.

**Mocks:** N/A

**Tests:** N/A

**Implementation:**

- [ ] T011 [P] Create TypeScript type definitions in `supabase/functions/_shared/types.ts` (UserSession, RepositoryFork, WorkflowJSONFile, WorkflowRegistration)
- [ ] T012 [P] Create GitHub App utilities in `supabase/functions/_shared/github-app.ts` (JWT generation, installation token management using @octokit/app)
- [ ] T013 [P] Create repository utilities in `supabase/functions/_shared/repository.ts` (fork detection, fork creation using @octokit/rest)
- [ ] T014 [P] Create workflow utilities in `supabase/functions/_shared/workflow.ts` (workflow dispatch trigger, file validation)
- [ ] T015 [P] Create authentication utilities in `supabase/functions/_shared/auth.ts` (JWT token validation, session management)
- [ ] T016 [P] Create frontend TypeScript types in `frontend/src/types/index.ts` (matching backend types)
- [ ] T017 [P] Create API client service in `frontend/src/services/api.ts` (HTTP client for Supabase Edge Functions)
- [ ] T018 Create health check Edge Function in `supabase/functions/health/index.ts` (basic health endpoint)
- [ ] T019 Configure Supabase Edge Function dependencies in `supabase/functions/_shared/deps.ts` (import @octokit packages via npm: specifier)
- [ ] T020 Create frontend layout component in `frontend/src/components/Layout.tsx` (basic page structure)
- [ ] T081 [P] Configure Jest coverage tooling for frontend in `frontend/package.json` (jest.config.js with coverage thresholds ≥80%)
- [ ] T082 [P] Configure Deno coverage tooling for backend in `supabase/tests/` (deno.json with coverage configuration)
- [ ] T083 [P] Document required GitHub App permissions in `design-docs/github-app-permissions.md` (repository creation, workflow dispatch, file management permissions per FR-004)
- [ ] T084 [P] Create GitHub App permissions validation utility in `supabase/functions/_shared/github-app.ts` (validates installation has required permissions)
- [ ] T085 [P] Create test for GitHub App permissions validation in `supabase/tests/functions/_shared/github-app.test.ts` (validates permission checks)
- [ ] T086 Add coverage validation gate task before Phase 3 completion (verify ≥80% coverage for Phase 2 foundational code)
- [ ] T087 Add coverage validation gate task before Phase 4 completion (verify ≥80% coverage for Phase 3 User Story 1 code)
- [ ] T088 Add coverage validation gate task before Phase 5 completion (verify ≥80% coverage for Phase 4 User Story 2 code)

## Phase 3: User Story 1 - Install FaaSr and Authenticate

**Goal**: Enable users to install FaaSr by authenticating with GitHub and automatically forking the FaaSr-workflow repository.

**Independent Test Criteria**: User can navigate to web app, click "Install FaaSr," complete GitHub authentication, and verify that a fork of the FaaSr-workflow repository appears in their GitHub account.

**Mocks:** N/A

**Tests:**

- [ ] T021 [P] [US1] Create test for InstallButton component in `frontend/tests/unit/components/InstallButton.test.tsx` (renders button, handles click)
- [ ] T022 [P] [US1] Create test for InstallPage component in `frontend/tests/unit/pages/InstallPage.test.tsx` (displays installation flow, handles redirect)
- [ ] T023 [P] [US1] Create test for auth Edge Function install endpoint in `supabase/tests/functions/auth-install.test.ts` (redirects to GitHub)
- [ ] T024 [P] [US1] Create test for auth Edge Function callback endpoint in `supabase/tests/functions/auth-callback.test.ts` (handles installation, creates fork)
- [ ] T025 [P] [US1] Create test for repository fork detection in `supabase/tests/functions/_shared/repository.test.ts` (detects existing fork)
- [ ] T026 [P] [US1] Create test for repository fork creation in `supabase/tests/functions/_shared/repository.test.ts` (creates new fork)
- [ ] T027 [P] [US1] Create test for GitHub App authentication in `supabase/tests/functions/_shared/github-app.test.ts` (JWT generation, installation token)
- [ ] T028 [P] [US1] Create test for useAuth hook in `frontend/tests/unit/hooks/useAuth.test.ts` (authentication state management)

**Implementation:**

- [ ] T029 [US1] Create InstallButton component in `frontend/src/components/InstallButton.tsx` (button that initiates installation)
- [ ] T030 [US1] Create InstallPage component in `frontend/src/pages/InstallPage.tsx` (installation flow page with status messages)
- [ ] T031 [US1] Create HomePage component in `frontend/src/pages/HomePage.tsx` (landing page with Install FaaSr button)
- [ ] T032 [US1] Create useAuth hook in `frontend/src/hooks/useAuth.ts` (authentication state management, session handling)
- [ ] T033 [US1] Implement auth Edge Function install endpoint in `supabase/functions/auth/index.ts` (GET /auth/install - redirects to GitHub App installation, validates required permissions per FR-004)
- [ ] T034 [US1] Implement auth Edge Function callback endpoint in `supabase/functions/auth/index.ts` (GET /auth/callback - handles installation callback, validates permissions, creates session)
- [ ] T035 [US1] Implement session creation in auth callback (stores installation ID, user info in JWT token, sets HTTP-only cookie)
- [ ] T036 [US1] Implement fork detection logic in `supabase/functions/_shared/repository.ts` (checks if fork exists before creating)
- [ ] T037 [US1] Implement fork creation logic in `supabase/functions/_shared/repository.ts` (creates fork using GitHub API)
- [ ] T038 [US1] Implement GitHub App JWT generation in `supabase/functions/_shared/github-app.ts` (generates JWT for app authentication)
- [ ] T039 [US1] Implement installation token retrieval in `supabase/functions/_shared/github-app.ts` (gets installation token using installation ID)
- [ ] T040 [US1] Create StatusNotification component in `frontend/src/components/StatusNotification.tsx` (displays success/error messages)
- [ ] T041 [US1] Integrate InstallButton with API client in `frontend/src/services/api.ts` (calls /auth/install endpoint)
- [ ] T042 [US1] Implement session cookie handling in frontend API client (sends cookies with requests, handles session state)
- [ ] T043 [US1] Configure React Router in `frontend/src/App.tsx` (routes for HomePage, InstallPage)
- [ ] T044 [US1] Implement error handling in auth Edge Function (handles GitHub API errors, provides user-friendly messages)
- [ ] T045 [US1] Implement session validation middleware in `supabase/functions/_shared/auth.ts` (validates JWT tokens from cookies)

## Phase 4: User Story 2 - Upload and Register Workflow JSON

**Goal**: Enable authenticated users to upload workflow JSON files, commit them to their FaaSr-workflow fork, and automatically trigger the FaaSr Register workflow.

**Independent Test Criteria**: Authenticated user can upload a valid workflow JSON file through the web app interface and verify that the file appears in their fork and the registration workflow is triggered.

**Mocks:** N/A

**Tests:**

- [ ] T046 [P] [US2] Create test for FileUpload component in `frontend/tests/unit/components/FileUpload.test.tsx` (file selection, validation, upload)
- [ ] T047 [P] [US2] Create test for UploadPage component in `frontend/tests/unit/pages/UploadPage.test.tsx` (displays upload interface, handles success/error)
- [ ] T048 [P] [US2] Create test for workflow upload Edge Function in `supabase/tests/functions/workflows-upload.test.ts` (validates file, commits to GitHub, triggers workflow)
- [ ] T049 [P] [US2] Create test for workflow status Edge Function in `supabase/tests/functions/workflows-status.test.ts` (returns workflow run status)
- [ ] T050 [P] [US2] Create test for workflow file validation in `supabase/tests/functions/_shared/workflow.test.ts` (JSON validation, file name validation)
- [ ] T051 [P] [US2] Create test for workflow dispatch trigger in `supabase/tests/functions/_shared/workflow.test.ts` (triggers GitHub Actions workflow)
- [ ] T052 [P] [US2] Create test for file commit to GitHub in `supabase/tests/functions/_shared/workflow.test.ts` (commits file to repository)
- [ ] T053 [P] [US2] Create test for workflow status polling in frontend API client (polls status endpoint, handles status updates)

**Implementation:**

- [ ] T054 [US2] Create FileUpload component in `frontend/src/components/FileUpload.tsx` (file input, JSON validation, upload progress)
- [ ] T055 [US2] Create UploadPage component in `frontend/src/pages/UploadPage.tsx` (upload interface with file selection and status display)
- [ ] T056 [US2] Implement workflow upload Edge Function in `supabase/functions/workflows/index.ts` (POST /workflows/upload - handles file upload, validation, commit, workflow trigger)
- [ ] T057 [US2] Implement workflow status Edge Function in `supabase/functions/workflows/index.ts` (GET /workflows/status/{fileName} - returns workflow registration status)
- [ ] T058 [US2] Implement FormData parsing in workflow upload Edge Function (parses multipart/form-data, extracts file)
- [ ] T059 [US2] Implement JSON file validation in `supabase/functions/_shared/workflow.ts` (validates JSON structure/syntax only, file name format, file size. Returns user-friendly "Invalid JSON" error message for malformed JSON)
- [ ] T060 [US2] Implement file commit to GitHub in `supabase/functions/_shared/workflow.ts` (commits file to user's fork using GitHub API)
- [ ] T061 [US2] Implement workflow dispatch trigger in `supabase/functions/_shared/workflow.ts` (triggers FaaSr Register workflow with workflow file name parameter)
- [ ] T062 [US2] Implement workflow status retrieval in `supabase/functions/_shared/workflow.ts` (queries GitHub Actions API for workflow run status)
- [ ] T063 [US2] Add upload endpoint to frontend API client in `frontend/src/services/api.ts` (POST /workflows/upload with FormData)
- [ ] T064 [US2] Add status endpoint to frontend API client in `frontend/src/services/api.ts` (GET /workflows/status/{fileName})
- [ ] T065 [US2] Implement client-side JSON validation in FileUpload component (validates JSON structure/syntax before upload, displays "Invalid JSON" error message)
- [ ] T066 [US2] Implement upload progress indicator in FileUpload component (shows upload status, success/error messages)
- [ ] T067 [US2] Integrate StatusNotification component in UploadPage (displays upload and registration status)
- [ ] T068 [US2] Add UploadPage route to React Router in `frontend/src/App.tsx` (route for /upload)
- [ ] T069 [US2] Implement authentication check in UploadPage (redirects to install if not authenticated)
- [ ] T070 [US2] Implement error handling in workflow upload Edge Function (handles validation errors, GitHub API errors, provides user-friendly messages)
- [ ] T071 [US2] Implement error handling in workflow status Edge Function (handles missing workflow, API errors)
- [ ] T072 [US2] Add workflow file name sanitization in `supabase/functions/_shared/workflow.ts` (prevents path traversal, validates safe file names)
- [ ] T073 [US2] Implement session validation in workflow Edge Functions (validates user session before processing uploads)

## Phase 5: Polish & Cross-Cutting Concerns

**Goal**: Add final touches, error handling improvements, documentation, and production readiness.

**Mocks:** N/A

**Tests:**

- [ ] T074 Create integration test for complete installation flow (end-to-end test from install button to fork creation)
- [ ] T075 Create integration test for complete upload flow (end-to-end test from file upload to workflow trigger)

**Implementation:**

- [ ] T076 Add comprehensive error messages for all error scenarios (rate limits, permissions, network failures)
- [ ] T077 Add loading states to all async operations in frontend components
- [ ] T078 Add JSDoc comments to all public APIs, classes, functions, and modules (React components, Edge Functions, shared utilities) per Constitution Principle II
- [ ] T079 Update README.md with complete setup instructions and deployment guide
- [ ] T080 Add environment variable validation on application startup (frontend and backend)

## Parallel Execution Examples

### Phase 2 Foundational Parallel Opportunities

The following tasks can be executed in parallel during Phase 2 implementation:

**Coverage & Testing Infrastructure (can work in parallel)**:

- T081, T082 (Jest and Deno coverage configuration)
- T086, T087, T088 (Coverage validation gates - sequential but can be prepared in parallel)

**GitHub App Permissions (can work in parallel)**:

- T083, T084, T085 (Permissions documentation, validation utility, and test)

**Shared Utilities (can work in parallel)**:

- T011, T012, T013, T014, T015 (All shared utility modules)
- T016, T017 (Frontend types and API client)

### User Story 1 Parallel Opportunities

The following tasks can be executed in parallel during User Story 1 implementation:

**Frontend Components (can work in parallel)**:

- T021, T029 (InstallButton component and test)
- T022, T030 (InstallPage component and test)
- T040 (StatusNotification component)

**Backend Edge Functions (can work in parallel)**:

- T023, T033 (Auth install endpoint and test)
- T024, T034 (Auth callback endpoint and test)
- T025, T026, T036, T037 (Repository utilities and tests)

**Shared Utilities (can work in parallel)**:

- T027, T038, T039 (GitHub App utilities and test)
- T028, T032 (useAuth hook and test)

### User Story 2 Parallel Opportunities

The following tasks can be executed in parallel during User Story 2 implementation:

**Frontend Components (can work in parallel)**:

- T046, T054 (FileUpload component and test)
- T047, T055 (UploadPage component and test)

**Backend Edge Functions (can work in parallel)**:

- T048, T056 (Workflow upload endpoint and test)
- T049, T057 (Workflow status endpoint and test)
- T050, T051, T052, T059, T060, T061 (Workflow utilities and tests)

## Notes

- All tasks follow the checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- Tasks marked with `[P]` can be executed in parallel
- Tasks marked with `[US1]` or `[US2]` belong to specific user stories
- File paths are absolute or relative to project root
- Each user story phase is independently testable
- MVP scope focuses on User Story 1, with User Story 2 as the next increment
