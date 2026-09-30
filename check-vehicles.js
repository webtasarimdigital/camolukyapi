const { createClient } = require('./node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://jlxuvdhwbzaotrdlmwyl.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpseHV2ZGh3Ynphb3RyZGxtd3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDU5ODgzMiwiZXhwIjoyMDY2MTc0ODMyfQ.FXKHDKy3D7eS4qcVQ-XK5f9lRxz5DhaqaH2TFSKBaG4';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data, error } = await sb.from('vehicles').select('id').limit(1);
  if (error && error.code === '42P01') {
    console.log('vehicles tablosu YOK - olusturulacak');
  } else if (error) {
    console.log('Hata:', error.message, error.code);
  } else {
    console.log('vehicles tablosu MEVCUT, rows:', data);
  }
}

run().catch(console.error);
