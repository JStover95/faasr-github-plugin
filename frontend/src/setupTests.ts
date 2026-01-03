/**
 * Jest setup file for test environment
 *
 * Configures testing library matchers and global test setup
 */

import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "node:util";

if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}

// Polyfill Request/Response for React Router v7 in test environment
// React Router v7 requires these Web APIs which aren't available in Node.js/jsdom by default
if (typeof global.Request === "undefined") {
  // Minimal polyfill for Request
  global.Request = class Request {
    url: string;
    method: string;
    headers: Headers;
    body: ReadableStream | null;
    bodyUsed: boolean;
    cache: RequestCache;
    credentials: RequestCredentials;
    destination: RequestDestination;
    integrity: string;
    keepalive: boolean;
    mode: RequestMode;
    redirect: RequestRedirect;
    referrer: string;
    referrerPolicy: ReferrerPolicy;
    signal: AbortSignal | null;

    constructor(input: string | Request, init?: RequestInit) {
      this.url = typeof input === "string" ? input : input.url;
      this.method = init?.method || "GET";
      this.headers = new Headers(init?.headers);
      this.body = null;
      this.bodyUsed = false;
      this.cache = init?.cache || "default";
      this.credentials = init?.credentials || "same-origin";
      this.destination = "document";
      this.integrity = init?.integrity || "";
      this.keepalive = init?.keepalive || false;
      this.mode = init?.mode || "cors";
      this.redirect = init?.redirect || "follow";
      this.referrer = "about:client";
      this.referrerPolicy = init?.referrerPolicy || "";
      this.signal = init?.signal || null;
    }
  } as any;

  // Minimal polyfill for Response
  global.Response = class Response {
    status: number;
    statusText: string;
    headers: Headers;
    ok: boolean;
    redirected: boolean;
    type: ResponseType;
    url: string;

    constructor(_body?: BodyInit | null, init?: ResponseInit) {
      this.status = init?.status || 200;
      this.statusText = init?.statusText || "OK";
      this.headers = new Headers(init?.headers);
      this.ok = this.status >= 200 && this.status < 300;
      this.redirected = false;
      this.type = "default";
      this.url = "";
    }
  } as any;
}

// Mock constants module to avoid import.meta.env issues in tests
jest.mock("./constants", () => ({
  API_BASE_URL: "http://localhost:54321/functions/v1",
}));
