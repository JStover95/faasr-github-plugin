/**
 * Workflows Edge Function
 *
 * Handles workflow file upload and registration:
 * - POST /workflows/upload - Uploads workflow JSON file, validates it, commits to GitHub, and triggers workflow dispatch
 * - GET /workflows/status/{fileName} - Returns workflow registration status
 */

import { corsHeaders } from '../_shared/cors.ts';
import { getSessionFromRequest } from '../_shared/auth.ts';
import { GitHubClientService } from '../_shared/github-client.ts';
import { WorkflowUploadService } from '../_shared/workflow-upload-service.ts';
import { WorkflowStatusService } from '../_shared/workflow-status-service.ts';
import {
  createAuthErrorResponse,
  createConfigurationErrorResponse,
  createErrorResponse,
  createNotFoundErrorResponse,
  createValidationErrorResponse,
} from '../_shared/error-handler.ts';

/**
 * Parse FormData from request
 */
async function parseFormData(req: Request): Promise<{
  file: File | null;
  fileName: string | null;
}> {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const fileName = file?.name || null;

  return { file, fileName };
}

/**
 * Handle POST /workflows/upload - Upload and register workflow JSON file
 */
async function handleUpload(req: Request): Promise<Response> {
  try {
    // Validate session
    const session = getSessionFromRequest(req);
    if (!session) {
      return createAuthErrorResponse();
    }

    // Parse FormData
    const { file, fileName } = await parseFormData(req);

    if (!file || !fileName) {
      return createValidationErrorResponse('File is required');
    }

    // Initialize services
    const githubClient = new GitHubClientService();
    const uploadService = new WorkflowUploadService(githubClient);

    // Execute upload business logic
    const uploadResult = await uploadService.uploadWorkflow(
      session,
      file,
      fileName,
    );

    // Trigger registration workflow
    const registrationResult = await uploadService.triggerRegistration(
      session,
      uploadResult.fileName,
    );

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Workflow uploaded and registration triggered',
        fileName: uploadResult.fileName,
        commitSha: uploadResult.commitSha,
        workflowRunId: registrationResult.workflowRunId,
        workflowRunUrl: registrationResult.workflowRunUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Upload error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.startsWith('Invalid file:')) {
      const errors = error.message.replace('Invalid file: ', '').split(', ');
      return createValidationErrorResponse('Invalid file', errors);
    }

    // Handle configuration errors
    if (
      error instanceof Error &&
      error.message.includes('GitHub App configuration missing')
    ) {
      return createConfigurationErrorResponse(error.message);
    }

    // Handle other errors
    return createErrorResponse(error, 500, 'Upload failed');
  }
}

/**
 * Handle GET /workflows/status/{fileName} - Get workflow registration status
 */
async function handleStatus(req: Request, fileName: string): Promise<Response> {
  try {
    // Validate session
    const session = getSessionFromRequest(req);
    if (!session) {
      return createAuthErrorResponse();
    }

    // Initialize services
    const githubClient = new GitHubClientService();
    const statusService = new WorkflowStatusService(githubClient);

    // Execute status retrieval business logic
    const result = await statusService.getWorkflowStatus(session, fileName);

    // Return success response
    return new Response(
      JSON.stringify({
        fileName: result.fileName,
        status: result.status,
        workflowRunId: result.workflowRunId,
        workflowRunUrl: result.workflowRunUrl,
        errorMessage: result.errorMessage,
        triggeredAt: result.triggeredAt,
        completedAt: result.completedAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Status error:', error);

    // Handle not found errors
    if (
      error instanceof Error &&
      error.message.includes('Workflow run not found')
    ) {
      return createNotFoundErrorResponse(error.message);
    }

    // Handle configuration errors
    if (
      error instanceof Error &&
      error.message.includes('GitHub App configuration missing')
    ) {
      return createConfigurationErrorResponse(error.message);
    }

    // Handle other errors
    return createErrorResponse(error, 500, 'Failed to get workflow status');
  }
}

/**
 * Main Edge Function handler
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Extract path after /functions/v1
  const pathMatch = url.pathname.match(/\/functions\/v1(\/.*)$/);
  const path = pathMatch ? pathMatch[1] : url.pathname;

  try {
    // Route to appropriate handler
    if (path === '/workflows/upload' && req.method === 'POST') {
      return await handleUpload(req);
    } else if (path.startsWith('/workflows/status/') && req.method === 'GET') {
      // Extract fileName from path
      const fileNameMatch = path.match(/\/workflows\/status\/(.+)$/);
      if (!fileNameMatch) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'File name is required',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      const fileName = decodeURIComponent(fileNameMatch[1]);
      return await handleStatus(req, fileName);
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Not found',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
