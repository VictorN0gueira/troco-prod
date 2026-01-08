import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jxwlttibcigihiyllhmz.supabase.co';
// Using the provided Publishable key as the Anon Key
const supabaseKey = 'sb_publishable_J6n8BuizmLDjbwUrxo2T-Q_qGh8B3qV';

export const supabase = createClient(supabaseUrl, supabaseKey);