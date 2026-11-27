import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing required environment variable: SUPABASE_URL');
}

const configuredSupabaseUrl: string = supabaseUrl;

if (!serviceRoleKey) {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

const serverAuthOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

export const supabaseAdmin = createClient(
  configuredSupabaseUrl,
  serviceRoleKey,
  serverAuthOptions,
);

export function createSupabaseUserClient(accessToken: string) {
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error('Missing required environment variable: SUPABASE_PUBLISHABLE_KEY');
  }

  return createClient(configuredSupabaseUrl, publishableKey, {
    ...serverAuthOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
