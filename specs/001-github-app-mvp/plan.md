# Implementation Plan: FaaSr GitHub App MVP

**Branch**: `001-github-app-mvp` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-github-app-mvp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A web application that allows users to install FaaSr by authenticating with GitHub, automatically forking the FaaSr-workflow repository, and uploading/registering workflow JSON files through a streamlined interface. The application uses React/TypeScript for the frontend UI and Supabase Edge Functions (Deno/TypeScript) for serverless backend interactions with GitHub via a GitHub App.

## Technical Context

**Language/Version**:

- Frontend: TypeScript 5.x, React 19.x
- Backend: Deno 1.x, TypeScript 5.x (Supabase Edge Functions)

**Primary Dependencies**:

- Frontend: React, TypeScript, React Router, React Testing Library, Jest
- Backend: Supabase Edge Functions runtime, @octokit/app (npm:), @octokit/rest (npm:), Deno standard library
- GitHub Integration: GitHub App (not OAuth App) using @octokit packages via npm: specifier in Deno

**Storage**:

- Stateless sessions: JWT tokens stored in HTTP-only cookies (client-side)
- No persistent database required for PoC (per spec: state does not persist between sessions)
- File uploads: FormData parsing in Edge Function, immediate commit to GitHub (no temporary storage)

**Testing**:

- Frontend: Jest, React Testing Library, @testing-library/user-event
- Backend: Deno test framework (built-in), mock GitHub API responses

**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)

**Project Type**: web (frontend + backend separation)

**Performance Goals**: OUT OF SCOPE (per Constitution Principle V - PoC focus)

**Constraints**:

- PoC/MVP scope - functional correctness over optimization
- No persistent state between sessions (user must re-authenticate)
- Single upload at a time per user (concurrent uploads out of scope)
- Must handle GitHub API rate limits gracefully
- Must validate workflow JSON format before committing
- Edge Function cold starts may add 100-500ms latency (acceptable for PoC)

**Scale/Scope**:

- PoC/MVP: Single user at a time
- 2 main user flows: Installation (auth + fork) and Workflow Registration (upload + commit + trigger)
- Minimal UI: Landing page, installation flow, upload interface, status notifications

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check (✅ PASSED)

Verify compliance with FaaSr GitHub App Constitution principles:

- **I. Modularity & Separation of Concerns**: ✅ Proposed structure maintains clear module boundaries with frontend/backend separation. Frontend components, services, and pages will be organized into discrete modules. Backend API routes, services, and GitHub integration will be separated. Dependencies minimized through explicit interfaces.

- **II. Documentation Requirements**: ✅ Documentation plan includes: React component docstrings (JSDoc), API endpoint documentation (OpenAPI/Swagger), GitHub App integration patterns documented in design-docs/, README files for frontend and backend setup.

- **III. Unit Testing**: ✅ Unit testing strategy: Frontend components tested with React Testing Library (≥80% coverage target). Backend services and API routes tested with appropriate framework (Jest/pytest). GitHub API interactions will be mocked. Testing strategy documented in design-docs/.

- **IV. Design Pattern Adherence**: ⚠️ Existing design patterns from design-docs/ to be identified during Phase 0 research. New patterns (GitHub App authentication flow, file upload handling, workflow trigger patterns) will be documented in design-docs/ during implementation.

- **V. PoC Scope**: ✅ No performance optimization planned. Focus on functional correctness and architectural soundness. Basic error handling and user feedback required for functionality.

**Violations**: None identified at this stage. All principles appear achievable within PoC scope.

### Post-Design Check (✅ PASSED)

After completing Phase 0 research and Phase 1 design:

- **I. Modularity & Separation of Concerns**: ✅ **CONFIRMED** - Project structure defined with clear frontend/backend separation. Module boundaries established: API routes, services, middleware, components, pages, hooks. Dependencies explicitly defined in research.md.

- **II. Documentation Requirements**: ✅ **CONFIRMED** - Documentation artifacts created: research.md (technical decisions), data-model.md (entity definitions), contracts/api.yaml (OpenAPI spec), quickstart.md (setup guide). Documentation plan ready for implementation phase.

- **III. Unit Testing**: ✅ **CONFIRMED** - Testing framework selected (Jest + React Testing Library). Testing strategy documented in research.md. Mocking approach defined for GitHub API interactions. ≥80% coverage target achievable with defined structure.

- **IV. Design Pattern Adherence**: ✅ **CONFIRMED** - GitHub App integration patterns researched and documented in research.md. Key patterns identified: JWT authentication, installation token management, workflow dispatch. Patterns will be documented in design-docs/ during implementation per Constitution requirement.

- **V. PoC Scope**: ✅ **CONFIRMED** - No performance optimization planned. Focus remains on functional correctness. Error handling and user feedback requirements defined in data-model.md and API contracts.

**Final Status**: All Constitution principles satisfied. Ready to proceed to implementation phase.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
supabase/
├── functions/
│   ├── auth/
│   │   └── index.ts              # GitHub App authentication Edge Function
│   ├── workflows/
│   │   └── index.ts              # Workflow upload/registration Edge Function
│   ├── health/
│   │   └── index.ts              # Health check Edge Function
│   └── _shared/
│       ├── github-app.ts         # GitHub App integration utilities
│       ├── repository.ts          # Repository fork/management utilities
│       ├── workflow.ts            # Workflow file handling utilities
│       ├── auth.ts               # JWT token validation utilities
│       └── types.ts              # TypeScript type definitions
├── tests/
│   └── functions/                # Edge Function tests
└── config.toml                   # Supabase configuration

frontend/
├── src/
│   ├── components/
│   │   ├── InstallButton.tsx    # Install FaaSr button component
│   │   ├── FileUpload.tsx       # Workflow JSON upload component
│   │   ├── StatusNotification.tsx # Success/error notification component
│   │   └── Layout.tsx           # Main layout component
│   ├── pages/
│   │   ├── HomePage.tsx         # Landing page
│   │   ├── InstallPage.tsx      # Installation flow page
│   │   └── UploadPage.tsx       # Workflow upload page
│   ├── services/
│   │   ├── api.ts               # API client for backend communication
│   │   └── github.ts            # GitHub-related utilities (if needed)
│   ├── hooks/
│   │   └── useAuth.ts           # Authentication hook
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   ├── App.tsx                  # Main app component
│   └── index.tsx                # Application entry point
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   └── services/
│   └── __mocks__/
├── public/
└── package.json
```

**Structure Decision**: Web application structure with serverless backend selected. Frontend and backend are separated into distinct directories to maintain clear boundaries. Frontend uses React component-based architecture with pages, components, services, and hooks. Backend uses Supabase Edge Functions organized by feature (auth, workflows, health) with shared utilities in `_shared/` directory. This structure supports modularity, testability, and clear separation of concerns as required by Constitution Principle I. Serverless architecture eliminates server management overhead while maintaining clean module boundaries.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations identified. All complexity is justified by functional requirements and PoC scope.

## Phase Completion Summary

### Phase 0: Research ✅ COMPLETE

**Deliverables**:

- ✅ `research.md` - Resolved all NEEDS CLARIFICATION items:
  - Backend: Supabase Edge Functions (Deno/TypeScript)
  - Testing framework: Deno test (backend) + Jest + React Testing Library (frontend)
  - GitHub App integration patterns: @octokit/app + @octokit/rest (via npm: specifier)
  - Storage strategy: Stateless JWT tokens (HTTP-only cookies)
  - File upload handling: FormData parsing in Edge Function, immediate GitHub commit
  - Workflow trigger: Direct API call to workflow_dispatch endpoint
  - Secrets management: Supabase Edge Function secrets (dashboard-managed)

### Phase 1: Design & Contracts ✅ COMPLETE

**Deliverables**:

- ✅ `data-model.md` - Entity definitions, relationships, validation rules, state transitions
- ✅ `contracts/api.yaml` - OpenAPI 3.0.3 specification for all REST API endpoints
- ✅ `contracts/README.md` - API contracts documentation
- ✅ `quickstart.md` - Setup and run instructions for developers
- ✅ Agent context updated (`.cursor/rules/specify-rules.mdc`)

### Next Steps

Ready for Phase 2: Task breakdown via `/speckit.tasks` command.
