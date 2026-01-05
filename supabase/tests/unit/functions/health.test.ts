/**
 * Tests for health check edge function handler
 *
 * Tests health check endpoint response and error handling
 */

import { assertEquals, assert } from 'jsr:@std/assert@1.0.16';
import { handleHealthCheck } from '../../../functions/health/index.ts';
import { createMockRequest } from './_shared/test-utils.ts';

// ============================================================================
// Tests for handleHealthCheck
// ============================================================================

Deno.test('handleHealthCheck - returns healthy status for GET request', async () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://example.com/health',
  });

  const response = handleHealthCheck(req);

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.status, 'healthy');
  assertEquals(body.version, '1.0.0');
  assert(typeof body.timestamp === 'string');
  assert(body.timestamp.length > 0);
});

Deno.test('handleHealthCheck - returns method not allowed for non-GET requests', async () => {
  const req = createMockRequest({
    method: 'POST',
    url: 'https://example.com/health',
  });

  const response = handleHealthCheck(req);

  assertEquals(response.status, 405);
  const body = await response.json();
  assertEquals(body.error, 'Method not allowed');
});

Deno.test('handleHealthCheck - returns method not allowed for PUT request', async () => {
  const req = createMockRequest({
    method: 'PUT',
    url: 'https://example.com/health',
  });

  const response = handleHealthCheck(req);

  assertEquals(response.status, 405);
  const body = await response.json();
  assertEquals(body.error, 'Method not allowed');
});

Deno.test('handleHealthCheck - returns method not allowed for DELETE request', async () => {
  const req = createMockRequest({
    method: 'DELETE',
    url: 'https://example.com/health',
  });

  const response = handleHealthCheck(req);

  assertEquals(response.status, 405);
  const body = await response.json();
  assertEquals(body.error, 'Method not allowed');
});

Deno.test('handleHealthCheck - includes CORS headers in response', () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://example.com/health',
  });

  const response = handleHealthCheck(req);

  assertEquals(response.status, 200);
  const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
  const corsMethods = response.headers.get('Access-Control-Allow-Methods');

  assertEquals(corsOrigin, '*');
  assertEquals(corsMethods, 'GET');
});

Deno.test('handleHealthCheck - timestamp is valid ISO string', async () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://example.com/health',
  });

  const response = handleHealthCheck(req);

  assertEquals(response.status, 200);
  const body = await response.json();
  const timestamp = body.timestamp;

  // Verify it's a valid ISO 8601 timestamp
  const date = new Date(timestamp);
  assert(!isNaN(date.getTime()));
  assert(timestamp.includes('T'));
  assert(timestamp.includes('Z') || timestamp.includes('+') || timestamp.includes('-'));
});

Deno.test('handleHealthCheck - response has correct content type', () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://example.com/health',
  });

  const response = handleHealthCheck(req);

  assertEquals(response.status, 200);
  const contentType = response.headers.get('Content-Type');
  assertEquals(contentType, 'application/json');
});

