import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jxwlttibcigihiyllhmz.supabase.co';
const supabaseKey = 'sb_publishable_J6n8BuizmLDjbwUrxo2T-Q_qGh8B3qV';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const testEmail = `test_${Date.now()}@example.com`;
    const testName = `Test User ${Date.now()}`;

    console.log(`Attempting to sign up user: ${testEmail}`);

    try {
        // 1. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: 'password123',
            options: {
                data: { full_name: testName }
            }
        });

        if (authError) {
            console.error('Auth Error:', authError.message);
            return;
        }

        console.log('✅ Auth successful. User ID:', authData.user?.id);

        // 2. Insert into usuarios
        if (authData.user?.email) {
            console.log('Attempting to insert into usuarios table...');
            const { data: dbData, error: dbError } = await supabase
                .from('usuarios')
                .insert([
                    {
                        email: authData.user.email,
                        nome: testName,
                        tem_plano: false
                    }
                ])
                .select();

            if (dbError) {
                console.error('❌ DB Insert Error:', dbError.message);
                console.error('Details:', dbError.details);
                console.error('Hint:', dbError.hint);
                console.error('Code:', dbError.code);
            } else {
                console.log('✅ DB Insert successful:', dbData);
            }
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testInsert();
