# API Contracts

This directory contains the API contract specifications for the FaaSr GitHub App MVP.

## Files

- `api.yaml`: OpenAPI 3.0.3 specification defining all REST API endpoints

## API Overview

The API provides endpoints for:

1. **Authentication** (`/api/auth/*`):
   - GitHub App installation flow
   - Session management
   - User authentication status

2. **Workflows** (`/api/workflows/*`):
   - Workflow JSON file upload
   - Workflow registration status

3. **Health** (`/api/health`):
   - System health checks

## Authentication

The API uses session-based authentication via HTTP cookies. After a user installs the GitHub App, a session is established and maintained via cookies.

## Usage

### Viewing the API Documentation

You can view the OpenAPI specification using tools like:

- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Redoc](https://redocly.com/)
- [Postman](https://www.postman.com/) (import OpenAPI spec)

### Code Generation

The OpenAPI specification can be used to generate client SDKs or server stubs using tools like:

- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger Codegen](https://swagger.io/tools/swagger-codegen/)

## Contract Testing

API contracts should be tested using contract testing tools to ensure frontend and backend implementations match the specification.
