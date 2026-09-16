import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

/**
 * Checks if Supabase client credentials are configured in frontend environment.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
};

/**
 * Singleton Supabase Client instance for browser session management.
 * In development without credentials, this will be null and the app operates in offline/local mode.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Initiates Google OAuth redirect through Supabase Auth.
 */
export const signInWithGoogle = async (redirectTo?: string) => {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment.'
    );
  }

  const defaultRedirect = `${window.location.origin}/login`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || defaultRedirect,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Clears Supabase session on logout.
 */
export const signOutSupabase = async (): Promise<void> => {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign-out notice:', e);
    }
  }
};

/**
 * Retrieves the current active Supabase session if available.
 */
export const getSupabaseSession = async (): Promise<Session | null> => {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
};
