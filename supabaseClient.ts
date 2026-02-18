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

// --- CONFIGURAÇÃO DE CREDENCIAIS ---
// Inseridas manualmente conforme solicitação.
// A 'public key' (Anon Key) é segura para uso no frontend.
// A 'secret key' foi omitida para segurança (deve ser usada apenas em servidores/backend).

const HARDCODED_URL = 'https://jxwlttibcigihiyllhmz.supabase.co';
const HARDCODED_KEY = 'sb_publishable_J6n8BuizmLDjbwUrxo2T-Q_qGh8B3qV';

// Prioriza variáveis de ambiente (.env), fallback para os valores fornecidos
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || HARDCODED_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_KEY || HARDCODED_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('Supabase URL ou Key não configuradas corretamente.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);