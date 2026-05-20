import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Supabase URL or Key not found in environment variables.");
    process.exit(1);
}

const supabase = createClient(url, key);

const email = process.env.VITE_ADMIN_EMAIL || 'admin@neomagic.org';
const password = (process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '').trim();
if (!password) {
    console.error(
        'Admin password required: set ADMIN_PASSWORD or VITE_ADMIN_PASSWORD in .env (no default for security).'
    );
    process.exit(1);
}

async function createAdminUser() {
    console.log(`Creating user with email: ${email}...`);
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name: 'Admin User' }
        }
    });

    if (error) {
        if (error.message.includes('User already registered') || error.status === 400 && error.message.includes('already registered')) {
            console.log('User already exists. Logging in to verify...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (signInError) {
                console.error('Error logging in:', signInError.message);
            } else {
                console.log('Successfully logged in as existing user!');
                console.log('User ID:', signInData.user.id);
            }
            return;
        }
        console.error('Error creating user:', JSON.stringify(error, null, 2));
        process.exit(1);
    }

    console.log('User created successfully!');
    console.log('User ID:', data.user?.id);

    if (data.session) {
        console.log('Session token acquired. The user is now active.');
    } else {
        console.log('Note: Email confirmation might be required depending on your Supabase settings.');
    }
}

createAdminUser();
