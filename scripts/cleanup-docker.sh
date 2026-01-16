#!/bin/bash

# Script para limpar espaço em disco ocupado pelo Docker
# Útil quando builds repetidos acumulam muito espaço

set -e

echo "========================================="
echo "Docker Cleanup - Liberando Espaço"
echo "========================================="
echo ""

# Mostrar uso atual de disco
echo "📊 Uso atual de disco:"
df -h /
echo ""

# Mostrar uso de espaço do Docker
echo "🐳 Espaço usado pelo Docker:"
docker system df
echo ""

# Perguntar confirmação
read -p "Deseja continuar com a limpeza? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo "❌ Limpeza cancelada."
    exit 0
fi

echo ""
echo "🧹 Iniciando limpeza..."
echo ""

# 1. Parar containers em execução (exceto os que você quer manter)
echo "⏸️  Parando containers..."
docker compose -f docker-compose.selfhost.yml down 2>/dev/null || true
echo "✅ Containers parados"
echo ""

# 2. Remover containers parados
echo "🗑️  Removendo containers parados..."
docker container prune -f
echo "✅ Containers removidos"
echo ""

# 3. Remover imagens não utilizadas (dangling)
echo "🖼️  Removendo imagens não utilizadas..."
docker image prune -f
echo "✅ Imagens removidas"
echo ""

# 4. Remover TODAS as imagens não usadas (cuidado!)
echo "🖼️  Removendo TODAS as imagens não usadas por containers..."
docker image prune -af
echo "✅ Todas imagens não usadas removidas"
echo ""

# 5. Remover volumes não utilizados
echo "💾 Removendo volumes não utilizados..."
docker volume prune -f
echo "✅ Volumes removidos"
echo ""

# 6. Remover networks não utilizadas
echo "🌐 Removendo networks não utilizadas..."
docker network prune -f
echo "✅ Networks removidas"
echo ""

# 7. Limpar build cache (AGRESSIVO - libera mais espaço)
echo "🏗️  Limpando build cache..."
docker builder prune -af
echo "✅ Build cache limpo"
echo ""

# 8. Limpeza completa do sistema Docker
echo "🧹 Limpeza completa do sistema Docker..."
docker system prune -af --volumes
echo "✅ Sistema Docker completamente limpo"
echo ""

# Mostrar resultado final
echo "========================================="
echo "✅ Limpeza concluída!"
echo "========================================="
echo ""

echo "📊 Uso de disco APÓS limpeza:"
df -h /
echo ""

echo "🐳 Espaço Docker APÓS limpeza:"
docker system df
echo ""

echo "💡 Dicas:"
echo "  - Execute este script antes de cada build se o espaço for limitado"
echo "  - Considere adicionar swap se tiver menos de 4GB RAM"
echo "  - Use '--no-cache' apenas quando necessário (consome mais espaço)"
echo ""
