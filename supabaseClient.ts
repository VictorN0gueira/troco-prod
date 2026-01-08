import { createClient } from '@supabase/supabase-js';

// Define types for import.meta.env to satisfy TypeScript
declare global {
  interface ImportMeta {
    env: {
      [key: string]: string | undefined;
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_KEY?: string;
    };
  }
}

// Safely access environment variables with fallback
// Using optional chaining (?.) prevents crash if import.meta.env is undefined
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env?.VITE_SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL ou Key não encontradas nas variáveis de ambiente. Verifique o arquivo .env ou as configurações da Vercel.');
}

// Use a placeholder if keys are missing to prevent initial crash, though auth will fail.
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseKey || 'placeholder';

export const supabase = createClient(safeUrl, safeKey);