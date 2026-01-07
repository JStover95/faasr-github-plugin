/**
 * Supabase client mocks for testing
 *
 * Provides mock implementations of Supabase Auth methods for use in frontend tests.
 */

export const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    setSession: jest.fn(),
    refreshSession: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
};

export const createClient = jest.fn(() => mockSupabase);

