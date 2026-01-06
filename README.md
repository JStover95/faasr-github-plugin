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
   supabase secrets set JWT_SECRET=your_strong_random_secret_here
   ```

   **Note**: For `JWT_SECRET`, use a strong, randomly generated secret (minimum 32 characters). You can generate one using:

   ```bash
   openssl rand -base64 32
   ```

5. Configure CORS for local development:

   ```bash
   # Allow your local frontend origin and enable credentials
   supabase secrets set CORS_ALLOW_ORIGIN=http://localhost:3000,http://localhost:5173
   supabase secrets set CORS_ALLOW_CREDENTIALS=true
   ```

   **Note**: Adjust the ports (`3000`, `5173`) to match your frontend development server port. If your frontend runs on a different port, add it to the comma-separated list.

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
- `JWT_SECRET` - Strong random secret for JWT signing (minimum 32 characters)

**Optional CORS Configuration:**

- `CORS_ALLOW_ORIGIN` - Comma-separated list of allowed origins (default: `"*"`)
- `CORS_ALLOW_CREDENTIALS` - Set to `"true"` to allow credentials (default: `"false"`)
- `CORS_ALLOW_HEADERS` - Comma-separated list of allowed headers (default: `"authorization, x-client-info, apikey, content-type"`)
- `CORS_ALLOW_METHODS` - Comma-separated list of allowed methods (default: `"GET, POST, PUT, DELETE, OPTIONS"`)

**Set secrets via CLI:**

```bash
supabase secrets set GITHUB_APP_ID=your_app_id
supabase secrets set GITHUB_CLIENT_ID=your_client_id
supabase secrets set GITHUB_CLIENT_SECRET=your_client_secret
supabase secrets set GITHUB_PRIVATE_KEY="$(cat path/to/private-key.pem)"
supabase secrets set JWT_SECRET=your_jwt_secret

# Configure CORS for production
supabase secrets set CORS_ALLOW_ORIGIN=https://your-frontend-domain.com
supabase secrets set CORS_ALLOW_CREDENTIALS=true
```

**Important CORS Notes:**

- If `CORS_ALLOW_CREDENTIALS` is `true`, `CORS_ALLOW_ORIGIN` cannot be `"*"` (browsers will reject this)
- For production, always specify explicit origins in `CORS_ALLOW_ORIGIN`
- For local development, include all ports your frontend might use (e.g., `http://localhost:3000,http://localhost:5173`)

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
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

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
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Note**: Variables must be prefixed with `VITE_` to be accessible in the frontend code.

#### Backend Environment Variables (Supabase Edge Functions)

Set these as secrets in Supabase (not in `.env` files):

| Variable | Description | Required | Default |
| ---------- | ------------- | ---------- | ------- |
| `GITHUB_APP_ID` | GitHub App ID from app settings | Yes | - |
| `GITHUB_CLIENT_ID` | GitHub App Client ID | Yes | - |
| `GITHUB_CLIENT_SECRET` | GitHub App Client Secret | Yes | - |
| `GITHUB_PRIVATE_KEY` | GitHub App Private Key (PEM format) | Yes | - |
| `JWT_SECRET` | Secret for JWT token signing (min 32 chars) | Yes | - |
| `CORS_ALLOW_ORIGIN` | Comma-separated allowed origins (e.g., `http://localhost:3000,https://example.com`) or `*` for wildcard | No | `"*"` |
| `CORS_ALLOW_CREDENTIALS` | Set to `"true"` to allow credentials in requests | No | `"false"` |
| `CORS_ALLOW_HEADERS` | Comma-separated allowed headers | No | `"authorization, x-client-info, apikey, content-type"` |
| `CORS_ALLOW_METHODS` | Comma-separated allowed HTTP methods | No | `"GET, POST, PUT, DELETE, OPTIONS"` |

**CORS Configuration Examples:**

**For local development:**

```bash
supabase secrets set CORS_ALLOW_ORIGIN=http://localhost:3000,http://localhost:5173
supabase secrets set CORS_ALLOW_CREDENTIALS=true
```

**For production:**

```bash
supabase secrets set CORS_ALLOW_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
supabase secrets set CORS_ALLOW_CREDENTIALS=true
```

**Security Note:** When `CORS_ALLOW_CREDENTIALS` is `true`, you must specify explicit origins in `CORS_ALLOW_ORIGIN`. Wildcard (`*`) is not allowed with credentials and will cause browser CORS errors.

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
- Check that the session cookie is being sent with requests
- Verify `JWT_SECRET` is set and matches between deployments

**3. "Permission denied" error:**

- Ensure the GitHub App has the required permissions:
  - Contents: Read & write
  - Actions: Read & write
  - Metadata: Read
- User may need to reinstall the GitHub App

**4. Frontend can't connect to backend:**

- Verify `VITE_SUPABASE_URL` is correct in `.env`
- Check that Edge Functions are deployed
- Verify CORS is configured correctly:
  - Check that `CORS_ALLOW_ORIGIN` includes your frontend URL
  - If using credentials, ensure `CORS_ALLOW_CREDENTIALS=true` and `CORS_ALLOW_ORIGIN` is not `"*"`
  - Verify the origin in the error message matches what's configured

**5. CORS errors in browser console:**

- **Error: "Access-Control-Allow-Origin header must not be the wildcard '*' when the request's credentials mode is 'include'"**
  - Set `CORS_ALLOW_CREDENTIALS=true` and specify explicit origins in `CORS_ALLOW_ORIGIN` (not `"*"`)
  - Example: `supabase secrets set CORS_ALLOW_ORIGIN=http://localhost:3000`
- **Error: "Request origin is not in allowed origins list"**
  - Add your frontend URL to `CORS_ALLOW_ORIGIN` (comma-separated for multiple origins)
  - Example: `supabase secrets set CORS_ALLOW_ORIGIN=http://localhost:3000,http://localhost:5173`

**6. Rate limit errors:**

- GitHub API has rate limits (5000 requests/hour for authenticated requests)
- Wait a few minutes and try again
- Consider implementing request caching for production

### Local Development Tips

1. **Use Supabase CLI for local testing:**

   ```bash
   supabase functions serve auth --no-verify-jwt
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
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **Storage**: Stateless sessions (no database required for PoC)

## License

See LICENSE file for details.
