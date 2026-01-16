# Otimizações de Build para VPS

Este documento descreve como otimizar o processo de build do sim_28conect em ambientes com recursos limitados (VPS).

## Problema: SIGKILL durante o build

O erro `SIGKILL (Forced quit)` durante `bun run build` geralmente ocorre quando o processo fica sem memória RAM.

## Soluções Implementadas

### 1. Limitação de Memória do Node.js no Dockerfile

O `docker/app.Dockerfile` foi otimizado com:

```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=2048"
```

Isso limita o heap do Node.js para 2GB, evitando que ele tente alocar toda a memória disponível.

### 2. Retry Automático com Mais Memória

```dockerfile
RUN bun run build || (echo "Build failed, retrying with lower concurrency..." && NODE_OPTIONS="--max-old-space-size=3072" bun run build)
```

Se a primeira tentativa falhar, o build tenta novamente com 3GB de limite.

## Soluções Adicionais

### Opção 1: Aumentar Swap na VPS

Se sua VPS tiver pouca RAM (menos de 4GB), adicione swap:

```bash
# Criar arquivo de swap de 4GB
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Opção 2: Ajustar Memória no Docker Compose

Se estiver usando docker-compose, adicione limites:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: docker/app.Dockerfile
      memory: 4g
      memswap: 6g
```

### Opção 3: Build Local e Deploy da Imagem

Se a VPS for muito limitada, faça o build localmente:

```bash
# 1. Build local
docker build -f docker/app.Dockerfile -t sim_28conect:latest .

# 2. Salvar imagem
docker save sim_28conect:latest | gzip > sim_28conect.tar.gz

# 3. Transferir para VPS
scp sim_28conect.tar.gz user@vps:/tmp/

# 4. Na VPS, carregar imagem
ssh user@vps
docker load < /tmp/sim_28conect.tar.gz
```

### Opção 4: Usar GitHub Actions ou CI/CD

Configure build automatizado em GitHub Actions:

```yaml
# .github/workflows/build.yml
name: Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -f docker/app.Dockerfile -t ghcr.io/${{ github.repository }}:latest .
      - name: Push to registry
        run: docker push ghcr.io/${{ github.repository }}:latest
```

### Opção 5: Otimizar Build do Next.js

Adicione ao `next.config.ts`:

```typescript
experimental: {
  optimizeCss: true,
  turbopackSourceMaps: false, // Já implementado
  workerThreads: false, // Desabilita worker threads se causar problemas de memória
}
```

## Monitoramento Durante o Build

### Ver uso de memória durante o build:

```bash
# Em outro terminal, monitore:
watch -n 1 'docker stats --no-stream'
```

### Logs detalhados do build:

```bash
docker build -f docker/app.Dockerfile --progress=plain -t sim_28conect:latest .
```

## Requisitos Mínimos Recomendados

- **RAM:** 4GB mínimo (6GB recomendado)
- **Swap:** 4GB (se RAM < 6GB)
- **Disco:** 20GB livre
- **CPU:** 2 cores mínimo

## Troubleshooting

### Build ainda falha com SIGKILL?

1. **Verifique memória disponível:**
   ```bash
   free -h
   ```

2. **Aumente NODE_OPTIONS no Dockerfile:**
   ```dockerfile
   ENV NODE_OPTIONS="--max-old-space-size=4096"
   ```

3. **Desabilite builds paralelos:**
   ```bash
   # Adicione ao package.json
   "build": "turbo build --concurrency=1"
   ```

4. **Limpe cache do Docker:**
   ```bash
   docker builder prune -af
   docker system prune -af
   ```

### Erro de espaço em disco?

```bash
# Limpar imagens antigas
docker image prune -af

# Limpar volumes não utilizados
docker volume prune -f
```

## Performance Esperada

Com as otimizações implementadas:

- **Build time:** 3-8 minutos (dependendo da VPS)
- **Uso de RAM:** Pico de ~2.5-3GB
- **Uso de disco:** ~5GB durante build, ~2GB final

## Suporte

Se o build continuar falhando após estas otimizações, considere:

1. Upgrade da VPS para plano com mais RAM
2. Usar serviço de CI/CD para builds (GitHub Actions, GitLab CI, etc.)
3. Build local + deploy de imagem pré-construída
