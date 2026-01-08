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
4. **Set the Authorization callback URL:**
   - **For local development** (if using `supabase start`): `http://localhost:54321/functions/v1/auth/callback`
   - **For production** (after Supabase setup): `https://your-project-ref.supabase.co/functions/v1/auth/callback`

   **Note**: Replace `your-project-ref` with your actual Supabase project reference ID. If you haven't set up Supabase yet, you can use a placeholder and update it later in your GitHub App settings.
5. Save App ID, Client ID, Client Secret, and Private Key

### 3. Set Up Supabase

1. Create a Supabase project at [Supabase Dashboard](https://app.supabase.com)
2. Log in to supabase from the `supabase` directory:

   ```bash
   supabase login
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
   supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
   supabase secrets set SUPABASE_ANON_KEY=your_anon_key_here
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

   **Note**:
   - Find your Supabase URL and keys in Supabase Dashboard → Settings → API
   - `SUPABASE_URL` is your project URL (e.g., `https://xxxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` is the public anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` is the service role key (keep this secret!)

### 4. Configure Frontend

1. Copy `.env.example` to `.env`:

   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Update `.env` with your Supabase URL and anon key (found in Supabase Dashboard → Settings → API):

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_API_BASE_URL=https://your-project-ref.supabase.co/functions/v1
   ```

   **Note**: Replace `your-project-ref` with your actual Supabase project reference ID.

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

The frontend will start on `http://localhost:5173` (or the port shown in the terminal).

**Local Supabase (optional):**

For local development with Supabase:

```bash
supabase start
```

This will start local Supabase services. Note that Edge Functions will need to be deployed separately even in local development.

## Deployment

### Deploying to Production

#### 1. Deploy Supabase Edge Functions

Deploy all Edge Functions to your Supabase project:

```bash
supabase functions deploy auth
supabase functions deploy workflows
supabase functions deploy health
```

Verify deployment:

```bash
supabase functions list
```

#### 2. Configure Production Environment Variables

Ensure all required environment variables are set in Supabase:

**Required Edge Function Secrets:**

- `GITHUB_APP_ID` - Your GitHub App ID
- `GITHUB_CLIENT_ID` - Your GitHub App Client ID
- `GITHUB_CLIENT_SECRET` - Your GitHub App Client Secret
- `GITHUB_PRIVATE_KEY` - Your GitHub App Private Key (PEM format)
- `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

**Set secrets via CLI:**

```bash
supabase secrets set GITHUB_APP_ID=your_app_id
supabase secrets set GITHUB_CLIENT_ID=your_client_id
supabase secrets set GITHUB_CLIENT_SECRET=your_client_secret
supabase secrets set GITHUB_PRIVATE_KEY="$(cat path/to/private-key.pem)"
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Note**: Find your Supabase URL and keys in Supabase Dashboard → Settings → API

**Or via Supabase Dashboard:**

1. Go to Project Settings → Edge Functions → Secrets
2. Add each secret variable

#### 3. Build and Deploy Frontend

**Option A: Deploy to Vercel/Netlify:**

1. Build the frontend:

   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the `dist` folder to your hosting provider

3. Set environment variables in your hosting provider:
   - `VITE_SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key
   - `VITE_API_BASE_URL` - Your Supabase Edge Functions URL (e.g., `https://xxxxx.supabase.co/functions/v1`)

**Option B: Deploy to Static Hosting:**

1. Build the frontend:

   ```bash
   cd frontend
   npm run build
   ```

2. Upload the `dist` folder contents to your static hosting provider

3. Configure environment variables as build-time variables (check your hosting provider's documentation)

#### 4. Update GitHub App Settings

In your GitHub App settings, update the callback URL to point to your Supabase Edge Function:

- **Homepage URL**: `https://your-frontend-domain.com`
- **Authorization callback URL**: `https://your-project-ref.supabase.co/functions/v1/auth/callback`
- **Setup URL** (optional): `https://your-frontend-domain.com/install`

**Note**: Replace `your-project-ref` with your actual Supabase project reference ID (found in Supabase Dashboard → Settings → General).

### Environment Variables Reference

#### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# API Configuration
VITE_API_BASE_URL=https://your-project-ref.supabase.co/functions/v1
```

**Note**: Replace `your-project-ref` with your actual Supabase project reference ID.

**Note**: Variables must be prefixed with `VITE_` to be accessible in the frontend code.

#### Backend Environment Variables (Supabase Edge Functions)

Set these as secrets in Supabase (not in `.env` files):

| Variable | Description | Required | Default |
| ---------- | ------------- | ---------- | ------- |
| `GITHUB_APP_ID` | GitHub App ID from app settings | Yes | - |
| `GITHUB_CLIENT_ID` | GitHub App Client ID | Yes | - |
| `GITHUB_CLIENT_SECRET` | GitHub App Client Secret | Yes | - |
| `GITHUB_PRIVATE_KEY` | GitHub App Private Key (PEM format) | Yes | - |
| `SUPABASE_URL` | Supabase project URL | Yes | - |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for admin operations) | Yes | - |

## Development

### Running Tests

**Frontend:**

```bash
cd frontend
npm test
```

Run tests with coverage:

```bash
cd frontend
npm test -- --coverage
```

**Backend (Edge Functions):**

```bash
deno test supabase/tests/functions/
```

Run with coverage:

```bash
deno test --coverage=coverage supabase/tests/functions/
deno coverage coverage
```

### Troubleshooting

#### Common Issues

**1. "GitHub App configuration missing" error:**

- Verify all GitHub App secrets are set in Supabase
- Check that `GITHUB_PRIVATE_KEY` includes the full PEM format with headers
- Ensure secrets are set for the correct project

**2. "Authentication required" error:**

- Verify the user has completed the GitHub App installation flow
- Check that the Authorization header is being sent with requests (should contain `Bearer <token>`)
- Verify Supabase Auth environment variables are set correctly (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Check browser console for Supabase Auth errors

**3. "Permission denied" error:**

- Ensure the GitHub App has the required permissions:
  - Contents: Read & write
  - Actions: Read & write
  - Metadata: Read
- User may need to reinstall the GitHub App

**4. Frontend can't connect to backend:**

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct in `.env`
- Check that Edge Functions are deployed
- Verify Supabase Auth is properly configured in the frontend

**5. Supabase Auth errors:**

- **Error: "Missing Supabase configuration"**
  - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in frontend `.env`
  - Restart the development server after updating `.env`
- **Error: "Failed to create session"**
  - Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly in Edge Function secrets
  - Check Supabase Dashboard → Edge Functions → Logs for detailed error messages

**6. Rate limit errors:**

- GitHub API has rate limits (5000 requests/hour for authenticated requests)
- Wait a few minutes and try again
- Consider implementing request caching for production

### Local Development Tips

1. **Use Supabase CLI for local testing:**

   ```bash
   supabase functions serve auth
   ```

2. **Test Edge Functions locally:**

   ```bash
   supabase functions serve
   ```

3. **View Edge Function logs:**

   ```bash
   supabase functions logs auth
   ```

4. **Debug Edge Functions:**
   - Use `console.log()` for debugging (visible in Supabase Dashboard → Edge Functions → Logs)
   - Check function logs in real-time: `supabase functions logs auth --follow`

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
- **Authentication**: Supabase Auth with Authorization headers (no cookies required)
- **Session Management**: Supabase Auth handles session tokens, refresh, and expiration
- **Storage**: User metadata stored in Supabase Auth (no separate database required)

## License

See LICENSE file for details.
