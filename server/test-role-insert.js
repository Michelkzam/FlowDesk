import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lxolgqkavtnnrzakjtrw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4b2xncWthdnRubnJ6YWtqdHJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDQ4NTMsImV4cCI6MjA5Nzk4MDg1M30.o6Ltqffw2u4lOx69PZ2PCrmYN7NYzjR9J1nskDyQHVM'
);

// Login as admin first
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'admin@flowdesk.com',
  password: 'admin123'
});

if (authError) {
  console.error('Auth error:', authError.message);
  process.exit(1);
}

console.log('Logado como admin');

// Try to insert a role
const { data, error } = await supabase
  .from('roles')
  .insert({
    name: 'Analista',
    permissions: ['tickets.create', 'tickets.edit', 'tickets.close'],
    status: 'active'
  })
  .select();

if (error) {
  console.error('Insert error:', error.message, error.details, error.hint);
} else {
  console.log('Insert OK:', data);
}
