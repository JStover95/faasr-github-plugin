export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.{ts,tsx}", "**/?(*.)+(spec|test).{ts,tsx}"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
        diagnostics: {
          ignoreCodes: [1343],
        },
        astTransformers: {
          before: [
            {
              path: "node_modules/ts-jest-mock-import-meta", // or, alternatively, 'ts-jest-mock-import-meta' directly, without node_modules.
              options: {
                metaObjectReplacement: {
                  url: "https://www.url.com",
                  env: {
                    VITE_SUPABASE_URL: "https://test.supabase.co",
                    VITE_SUPABASE_ANON_KEY: "test-anon-key",
                    VITE_API_BASE_URL: "http://localhost:54321/functions/v1",
                    DEV: false,
                    PROD: false,
                    MODE: "test",
                  },
                },
              },
            },
          ],
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "<rootDir>/tests/__mocks__/styleMock.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/vite-env.d.ts",
  ],
  testTimeout: 10000,
};
