import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import knex from 'knex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, './.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

const url = new URL(dbUrl);
const db = knex({
  client: 'pg',
  connection: {
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    database: url.pathname.slice(1),
    user: url.username,
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false }
  }
});

const SQL_SETUP = `
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Aviso: Não foi possível remover do auth.users: %', SQLERRM;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_deleted ON public.users;

CREATE TRIGGER on_user_deleted
  AFTER DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();
`;

async function setupAuthCleanup() {
  try {
    console.log('🔧 Configurando limpeza automática de Auth...');

    await db.raw(SQL_SETUP);

    console.log('✅ Trigger configurado com sucesso!');
    console.log('📝 Agora ao deletar um usuário da tabela users,');
    console.log('   ele também será removido do auth.users automaticamente.');

    const { rows } = await db.raw(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'on_user_deleted'
    `);

    if (rows.length > 0) {
      console.log('\n🔍 Verificação do trigger:');
      console.log(`   Nome: ${rows[0].trigger_name}`);
      console.log(`   Evento: ${rows[0].event_manipulation}`);
      console.log(`   Tabela: ${rows[0].event_object_table}`);
    }

  } catch (error) {
    console.error('❌ Erro ao configurar trigger:', error.message);

    if (error.message.includes('permission denied') || error.message.includes('must be owner')) {
      console.log('\n⚠️  Não foi possível criar o trigger via Knex.');
      console.log('📋 Execute o SQL manualmente no SQL Editor do Supabase:');
      console.log('\n' + SQL_SETUP);
    }
  } finally {
    await db.destroy();
  }
}

setupAuthCleanup();
