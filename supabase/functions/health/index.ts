/**
 * Health check Edge Function
 *
 * Provides a simple health check endpoint to verify the API is running
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
}

/**
 * Handle health check request
 */
export function handleHealthCheck(req: Request): Response {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const healthResponse: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    return new Response(JSON.stringify(healthResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    const healthResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    return new Response(JSON.stringify(healthResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

if (import.meta.main) {
  serve(handleHealthCheck);
}
