#!/bin/bash
# Script para aplicar a correção do modelo do Copilot
# Execute este script na raiz do projeto

set -e

FILE="apps/sim/stores/panel/copilot/store.ts"

if [ ! -f "$FILE" ]; then
    echo "❌ Erro: Arquivo $FILE não encontrado!"
    echo "Execute este script na raiz do projeto sim_28conect"
    exit 1
fi

echo "🔍 Procurando pela função sendMessage..."

# Cria backup
cp "$FILE" "${FILE}.backup"
echo "💾 Backup criado em ${FILE}.backup"

# Usa sed para adicionar a linha do model após a linha do mode
# Procura pela linha que contém "mode: mode === 'ask'" e adiciona model na próxima linha
sed -i "/mode: mode === 'ask'/a\      model: get().selectedModel," "$FILE"

if [ $? -eq 0 ]; then
    echo "✅ Modificação aplicada com sucesso!"
    echo ""
    echo "🔍 Verificando a mudança:"
    git diff "$FILE" | head -20
    echo ""
    echo "📦 Próximos passos:"
    echo "1. Revise a mudança com: git diff $FILE"
    echo "2. Se estiver correto, faça commit:"
    echo "   git add $FILE"
    echo "   git commit -m 'fix: send selected model to backend in copilot chat requests'"
    echo "   git push origin fix/copilot-model-selection"
    echo ""
    echo "📝 Para reverter: mv ${FILE}.backup $FILE"
else
    echo "❌ Erro ao aplicar modificação"
    echo "Restaurando backup..."
    mv "${FILE}.backup" "$FILE"
    exit 1
fi
