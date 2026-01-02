# Quickstart Guide: FaaSr GitHub App MVP

**Date**: 2025-01-27  
**Purpose**: Setup and run instructions for developers

## Prerequisites

- Node.js 22+ and npm (for frontend)
- Deno 1.x (for Supabase Edge Functions)
- Supabase CLI
- GitHub account
- Supabase account (free tier available)

## Step 1: Create GitHub App

1. Navigate to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New GitHub App"
3. Configure the app:
   - **GitHub App name**: `FaaSr` (or your preferred name)
   - **Homepage URL**: `http://localhost:5173` (for local development)
   - **Callback URL**: `https://your-project-ref.supabase.co/functions/v1/auth` (update after Supabase setup)
   - **Webhook URL**: Leave empty for PoC (webhooks not required)
   - **Webhook secret**: Leave empty
   - **Permissions**:
     - **Repository permissions**:
       - Contents: Read & write
       - Actions: Read & write
       - Metadata: Read (always required)
   - **Where can this GitHub App be installed?**: Only on this account (for PoC)
4. Click "Create GitHub App"
5. **Save the following**:
   - **App ID**: Found on the app settings page
   - **Client ID**: Found on the app settings page
   - **Client Secret**: Click "Generate a new client secret" and save it
   - **Private Key**: Click "Generate a private key" and save the `.pem` file

## Step 2: Supabase Setup

1. Create a Supabase project:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Click "New Project"
   - Fill in project details (name, database password, region)
   - Wait for project to be created (takes ~2 minutes)

2. Install Supabase CLI and login:

   ```bash
   npm install -g supabase
   supabase login
   ```

3. Initialize Supabase in your project:

   ```bash
   supabase init
   ```

4. Link your local project to Supabase:

   ```bash
   supabase link --project-ref your-project-ref
   ```

   (Find your project ref in Supabase Dashboard → Settings → General)

5. Set Edge Function secrets (replace with your actual values):

   ```bash
   supabase secrets set GITHUB_APP_ID=your_app_id_here
   supabase secrets set GITHUB_CLIENT_ID=your_client_id_here
   supabase secrets set GITHUB_CLIENT_SECRET=your_client_secret_here
   supabase secrets set GITHUB_PRIVATE_KEY="$(cat path/to/your-private-key.pem)"
   ```

   **Note**: For the private key, you can either:
   - Read the entire PEM file content and set it as a secret (recommended)
   - Or store the file path and read it in the Edge Function (less secure)

6. Start Supabase locally (optional, for local development):

   ```bash
   supabase start
   ```

7. Deploy Edge Functions:

   ```bash
   supabase functions deploy auth
   supabase functions deploy workflows
   supabase functions deploy health
   ```

   Your Edge Functions will be available at:
   - `https://your-project-ref.supabase.co/functions/v1/auth`
   - `https://your-project-ref.supabase.co/functions/v1/workflows`
   - `https://your-project-ref.supabase.co/functions/v1/health`

## Step 3: Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env` file in the `frontend/` directory:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

   Find your Supabase URL and anon key in:
   - Supabase Dashboard → Settings → API
   - Or use local URL if running `supabase start`: `http://localhost:54321`

4. Start the frontend development server:

   ```bash
   npm run dev
   ```

   The frontend should start on `http://localhost:5173` (or another port if 5173 is taken)

## Step 4: Update GitHub App Callback URL

1. Go back to your GitHub App settings
2. Update the **Callback URL** to match your Supabase Edge Function URL:
   - For production: `https://your-project-ref.supabase.co/functions/v1/auth`
   - For local development (if using `supabase start`): `http://localhost:54321/functions/v1/auth`

## Step 5: Test the Application

1. Open your browser and navigate to `http://localhost:5173`
2. Click "Install FaaSr"
3. You should be redirected to GitHub to install the app
4. After installation, you should be redirected back and see a success message
5. Verify that a fork of `FaaSr-workflow` was created in your GitHub account
6. Upload a workflow JSON file
7. Verify the file appears in your fork and the registration workflow is triggered

## Project Structure

```plaintext
faasr-github-plugin/
├── supabase/
│   ├── functions/
│   │   ├── auth/
│   │   │   └── index.ts          # Authentication Edge Function
│   │   ├── workflows/
│   │   │   └── index.ts          # Workflow upload/registration Edge Function
│   │   ├── health/
│   │   │   └── index.ts          # Health check Edge Function
│   │   └── _shared/
│   │       ├── github-app.ts     # Shared GitHub App utilities
│   │       ├── repository.ts     # Repository management utilities
│   │       ├── workflow.ts       # Workflow handling utilities
│   │       ├── auth.ts           # JWT token utilities
│   │       └── types.ts          # TypeScript type definitions
│   ├── tests/
│   │   └── functions/            # Edge Function tests
│   └── config.toml                # Supabase configuration
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── hooks/
│   ├── tests/
│   ├── .env
│   └── package.json
└── specs/
    └── 001-github-app-mvp/
        ├── contracts/
        ├── data-model.md
        ├── research.md
        └── quickstart.md
```

## Development Workflow

1. **Edge Function Development**:
   - Make changes to Edge Function code in `supabase/functions/`
   - Deploy changes: `supabase functions deploy <function-name>`
   - For local testing: `supabase start` then test locally
   - Test Edge Functions using tools like Postman, curl, or the Supabase Dashboard

2. **Frontend Development**:
   - Make changes to frontend code
   - Frontend hot-reloads automatically
   - Test UI interactions in browser

3. **Testing**:
   - Run Edge Function tests: `deno test supabase/tests/functions/`
   - Run frontend tests: `cd frontend && npm test`
   - Test Edge Functions locally: `supabase functions serve <function-name>`

## Common Issues

### "Installation callback failed"

- Verify the callback URL in GitHub App settings matches your Supabase Edge Function URL
- Check that `GITHUB_CLIENT_SECRET` is correctly set as a Supabase secret
- Verify Edge Function is deployed: `supabase functions list`
- Check Edge Function logs in Supabase Dashboard → Edge Functions → Logs

### "Fork creation failed"

- Verify the GitHub App has "Contents: Read & write" permission
- Check that the source repository (`FaaSr/FaaSr-workflow`) exists and is accessible
- Ensure the user has permission to create repositories
- Verify `GITHUB_PRIVATE_KEY` secret is correctly set (check for newlines/formatting issues)

### "Workflow dispatch failed"

- Verify the GitHub App has "Actions: Read & write" permission
- Check that the workflow file exists in the repository
- Ensure the workflow file name matches exactly (case-sensitive)

### CORS errors

- Supabase Edge Functions handle CORS automatically, but verify your frontend URL is allowed
- Check Supabase Dashboard → Edge Functions → Settings for CORS configuration
- Ensure frontend is using the correct Supabase URL

### "Secret not found" errors

- Verify secrets are set: `supabase secrets list`
- Check secret names match exactly (case-sensitive)
- For local development, use `.env.local` file or `supabase secrets set` with `--local` flag

## Next Steps

- Review the [data model](./data-model.md) to understand entities and relationships
- Review the [API contracts](./contracts/api.yaml) for endpoint details
- Review the [research](./research.md) for technical decisions and patterns
- Review the [implementation plan](./plan.md) for architecture details

## Production Deployment

For production deployment:

1. **Supabase Edge Functions**:
   - Edge Functions are automatically deployed to production when you run `supabase functions deploy`
   - Secrets are managed via Supabase Dashboard (Settings → Edge Functions → Secrets)
   - HTTPS is automatically handled by Supabase
   - Monitor function logs in Supabase Dashboard → Edge Functions → Logs

2. **Frontend**:
   - Deploy frontend to Vercel, Netlify, or similar platform
   - Set environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Update GitHub App callback URL to production Supabase Edge Function URL

3. **GitHub App**:
   - Update callback URL to production Supabase Edge Function URL
   - Ensure all secrets are set in Supabase Dashboard

4. **Additional Considerations**:
   - Set up proper logging and monitoring via Supabase Dashboard
   - Configure CORS in Supabase Dashboard if needed
   - Review Supabase usage limits on free tier
   - Consider upgrading if you exceed free tier limits

## Support

For issues or questions, refer to:

- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Design Documentation](../../../design-docs/design-docs.md)
