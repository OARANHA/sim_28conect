# Patch: Correção para Seleção de Modelo do Copilot

## Problema
O frontend armazena o modelo selecionado (`selectedModel`) no Zustand store do Copilot, mas não o envia ao backend na chamada da API.

## Arquivo a Modificar
`apps/sim/stores/panel/copilot/store.ts`

## Localização
Dentro do `create<CopilotStore>()`, procure pela função `sendMessage`. Especificamente, encontre a chamada para `sendStreamingMessage()`.

## Mudança Necessária

### ANTES (código atual - linhas ~2500-2520 aproximadamente):
```typescript
const response = await sendStreamingMessage({
  message: content,
  userMessageId: userMessage.id,
  chatId: currentChat?.id,
  workflowId,
  mode: mode === 'ask' ? 'ask' : mode === 'plan' ? 'plan' : 'agent',
  prefetch: agentPrefetch,
  fileAttachments: fileAttachments || undefined,
  contexts: contexts || undefined,
  abortSignal: abortController.signal,
})
```

### DEPOIS (código corrigido):
```typescript
const response = await sendStreamingMessage({
  message: content,
  userMessageId: userMessage.id,
  chatId: currentChat?.id,
  workflowId,
  mode: mode === 'ask' ? 'ask' : mode === 'plan' ? 'plan' : 'agent',
  model: get().selectedModel,  // ← ADICIONAR ESTA LINHA
  prefetch: agentPrefetch,
  fileAttachments: fileAttachments || undefined,
  contexts: contexts || undefined,
  abortSignal: abortController.signal,
})
```

## Verificação
1. Interface `SendMessageRequest` em `apps/sim/lib/copilot/api.ts` já aceita o campo `model`
2. O store já possui o campo `selectedModel` que armazena o modelo escolhido
3. Após aplicar o patch, o modelo será enviado ao backend em toda requisição

## Como Aplicar
```bash
# Edite manualmente o arquivo apps/sim/stores/panel/copilot/store.ts
# Adicione a linha conforme indicado acima
```

## Teste
1. Após aplicar, abra DevTools (F12)
2. Vá para Network
3. Envie uma mensagem no Copilot
4. Verifique o payload de `POST /api/copilot/chat`
5. Confirme que contém `"model": "claude-4.5-opus"` (ou outro modelo selecionado)
