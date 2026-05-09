#!/bin/bash
# deploy.sh — Script de deploy do Despesas to Dinnero
# Uso: ./deploy.sh "PWA v1.0.2 - descrição da mudança"

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cd ~/despesas-to-dinnero

echo ""
echo -e "${YELLOW}=== Despesas to Dinnero — Deploy ===${NC}"
echo ""

# Limpar lock órfão se existir
if [ -f .git/index.lock ]; then
    rm -f .git/index.lock
    echo -e "${YELLOW}⚠ Lock órfão removido${NC}"
fi

# Verificar se há mudanças
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${RED}✗ Nenhuma mudança detectada. Nada para deployar.${NC}"
    echo "  Salve os arquivos novos na pasta antes de rodar o deploy."
    exit 1
fi

# Mostrar o que mudou
echo -e "${GREEN}Arquivos modificados:${NC}"
git status --short
echo ""

# Verificar mensagem de commit
if [ -z "$1" ]; then
    echo -e "${RED}✗ Faltou a mensagem de commit.${NC}"
    echo "  Uso: ./deploy.sh \"PWA v1.0.2 - descrição\""
    exit 1
fi

# Confirmar
echo -e "Mensagem: ${GREEN}$1${NC}"
echo ""
read -p "Confirma deploy? (s/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}Deploy cancelado.${NC}"
    exit 0
fi

# Executar
echo ""
echo "Fazendo commit..."
git add .
git commit -m "$1"

echo ""
echo "Fazendo push para GitHub..."
git push origin main

echo ""
echo -e "${GREEN}✓ Deploy concluído!${NC}"
echo "  → Vercel vai deployar automaticamente em ~30 segundos"
echo "  → Teste no iPhone: feche e reabra o app"
echo ""
