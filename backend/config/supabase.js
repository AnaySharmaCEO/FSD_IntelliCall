import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configuration error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables. ' +
    'Please define both variables in your .env file before starting the application.'
  );
}

// Base client options for stateless server environments
const baseClientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

/**
 * Shared public Supabase client.
 * Used strictly for public operations such as validating user JWTs via supabase.auth.getUser(token).
 * NEVER store user-specific JWTs or session state in this client.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  baseClientOptions
);

/**
 * Factory function creating a fresh, isolated Supabase client scoped to a single request.
 * Forwards the caller's JWT through global headers so PostgreSQL Row Level Security (RLS)
 * is preserved and evaluated with auth.uid() = user.id.
 *
 * @param {string} token - The caller's Bearer JWT access token
 * @returns {import('@supabase/supabase-js').SupabaseClient} Request-scoped Supabase client
 */
export const createAuthenticatedClient = (token) => {
  if (!token) {
    throw new Error('A valid JWT token is required to create an authenticated Supabase client.');
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      ...baseClientOptions,
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
};

export default supabase;
