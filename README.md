# FaaSr GitHub App MVP

A web application that allows users to install FaaSr by authenticating with GitHub, automatically forking the FaaSr-workflow repository, and uploading/registering workflow JSON files through a streamlined interface.

## Project Structure

```plaintext
faasr-github-plugin/
├── supabase/
│   ├── functions/          # Supabase Edge Functions (Deno/TypeScript)
│   │   ├── auth/          # Authentication endpoints
│   │   ├── workflows/     # Workflow upload/registration endpoints
│   │   ├── health/        # Health check endpoint
│   │   └── _shared/       # Shared utilities
│   ├── tests/             # Edge Function tests
│   └── config.toml        # Supabase configuration
├── frontend/              # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client services
│   │   ├── hooks/        # React hooks
│   │   └── types/        # TypeScript types
│   ├── tests/            # Frontend tests
│   └── package.json      # Frontend dependencies
└── specs/                # Feature specifications
    └── 001-github-app-mvp/
```

## Prerequisites

- Node.js 22+ and npm (for frontend)
- Deno 1.x (for Supabase Edge Functions)
- Supabase CLI
- GitHub account
- Supabase account (free tier available)

## Quick Start

### 1. Install Dependencies

**Frontend:**

```bash
cd frontend
npm install
```

**Supabase CLI:**

```bash
npm install -g supabase
supabase login
```

### 2. Set Up GitHub App

1. Navigate to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New GitHub App"
3. Configure the app with required permissions:
   - Contents: Read & write
   - Actions: Read & write
   - Metadata: Read
4. Save App ID, Client ID, Client Secret, and Private Key

### 3. Set Up Supabase

1. Create a Supabase project at [Supabase Dashboard](https://app.supabase.com)
2. Initialize Supabase in your project:

   ```bash
   supabase init
   ```

3. Link your project:

   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Set Edge Function secrets:

   ```bash
   supabase secrets set GITHUB_APP_ID=your_app_id_here
   supabase secrets set GITHUB_CLIENT_ID=your_client_id_here
   supabase secrets set GITHUB_CLIENT_SECRET=your_client_secret_here
   supabase secrets set GITHUB_PRIVATE_KEY="$(cat path/to/your-private-key.pem)"
   supabase secrets set JWT_SECRET=your_strong_random_secret_here
   ```

   **Note**: For `JWT_SECRET`, use a strong, randomly generated secret (minimum 32 characters). You can generate one using:

   ```bash
   openssl rand -base64 32
   ```

### 4. Configure Frontend

1. Copy `.env.example` to `.env`:

   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Update `.env` with your Supabase URL and anon key (found in Supabase Dashboard → Settings → API)

### 5. Deploy Edge Functions

```bash
supabase functions deploy auth
supabase functions deploy workflows
supabase functions deploy health
```

### 6. Start Development

**Frontend:**

```bash
cd frontend
npm run dev
```

**Local Supabase (optional):**

```bash
supabase start
```

## Development

### Running Tests

**Frontend:**

```bash
cd frontend
npm test
```

**Backend (Edge Functions):**

```bash
deno test supabase/tests/functions/
```

### Project Documentation

- [Feature Specification](./specs/001-github-app-mvp/spec.md)
- [Implementation Plan](./specs/001-github-app-mvp/plan.md)
- [Data Model](./specs/001-github-app-mvp/data-model.md)
- [API Contracts](./specs/001-github-app-mvp/contracts/api.yaml)
- [Quickstart Guide](./specs/001-github-app-mvp/quickstart.md)
- [Research & Technical Decisions](./specs/001-github-app-mvp/research.md)

## Architecture

- **Frontend**: React 19.x + TypeScript 5.x with Vite
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **GitHub Integration**: GitHub App using @octokit/app and @octokit/rest
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **Storage**: Stateless sessions (no database required for PoC)

## License

See LICENSE file for details.
