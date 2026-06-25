#!/bin/bash

echo "=========================================="
echo "   FlowDesk - Configuração do Supabase"
echo "=========================================="
echo ""

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
  echo "❌ Arquivo .env não encontrado!"
  echo "   Copie .env.example para .env e preencha as credenciais."
  exit 1
fi

# Verificar se DATABASE_URL está configurado
if grep -q "\[SUA_SENHA\]" .env; then
  echo "⚠️  DATABASE_URL não configurado!"
  echo ""
  echo "Instruções:"
  echo "1. Acesse https://supabase.com"
  echo "2. Crie um novo projeto ou use um existente"
  echo "3. Vá em Settings > Database"
  echo "4. Copie a Connection string (URI)"
  echo "5. Substitua no arquivo .env:"
  echo "   DATABASE_URL=postgresql://postgres:[SUA_SENHA]@db.[PROJETO].supabase.co:5432/postgres"
  echo ""
  echo "Depois execute novamente: npm run setup"
  exit 1
fi

echo "✅ Arquivo .env configurado"
echo ""

# Executar schema SQL
echo "📋 Executando schema no Supabase..."
echo "   IMPORTANTE: Execute o arquivo supabase-schema.sql no painel do Supabase"
echo "   Vá em SQL Editor > New query > Cole o conteúdo do arquivo"
echo ""

# Executar migrações
echo "🔄 Executando migrações..."
npm run migrate

if [ $? -ne 0 ]; then
  echo "❌ Erro nas migrações"
  exit 1
fi

echo ""

# Executar seed
echo "🌱 Populando dados iniciais..."
npm run seed

if [ $? -ne 0 ]; then
  echo "❌ Erro no seed"
  exit 1
fi

echo ""
echo "=========================================="
echo "   ✅ Configuração concluída!"
echo "=========================================="
echo ""
echo "Para iniciar o servidor:"
echo "   npm run dev"
echo ""
