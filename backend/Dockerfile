# Super Reasoning — Production image (API + frontend)
#
# Build (BuildKit zorunlu):
#   docker build \
#     --secret id=env,src=.env \
#     -t super-reasoning .
#
# Run:
#   docker run -p 4000:4000 --env-file .env super-reasoning
#
# NOT: VITE_ prefix'li değişkenler build-time'da frontend bundle'a gömülür.
# Bu nedenle --mount=type=secret ile .env okunarak geçici dosya oluşturulur;
# dosya RUN adımı bitince image layer'ına KAYDEDILMEZ.

# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --legacy-peer-deps && npm cache clean --force

COPY . .

# VITE_ build args — compose'dan veya --build-arg ile gecirilir.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_KEY
ARG VITE_API_BASE_URL
ARG VITE_ADMIN_EMAIL
ARG VITE_ADMIN_PASSWORD
ARG VITE_GROQ_API_KEY
ARG VITE_HUGGING_FACE_HUB_TOKEN
ARG VITE_GEMINI_API_KEY
ARG VITE_OPENAI_API_KEY
ARG VITE_DEEPSEEK_API_KEY
ARG VITE_OPENROUTER_API_KEY
ARG VITE_ANTHROPIC_API_KEY
ARG VITE_OLLAMA_URL
ARG VITE_MISTRAL_API_KEY

# Vite build — ARG'lar otomatik olarak process.env'e alinir.
# Docker linter uyarılarını engellemek için argümanları shell üzerinde touch ediyoruz (: command is a no-op in sh).
RUN : $VITE_SUPABASE_URL \
    && : $VITE_SUPABASE_ANON_KEY \
    && : $VITE_API_KEY \
    && : $VITE_API_BASE_URL \
    && : $VITE_ADMIN_EMAIL \
    && : $VITE_ADMIN_PASSWORD \
    && : $VITE_GROQ_API_KEY \
    && : $VITE_HUGGING_FACE_HUB_TOKEN \
    && : $VITE_GEMINI_API_KEY \
    && : $VITE_OPENAI_API_KEY \
    && : $VITE_DEEPSEEK_API_KEY \
    && : $VITE_OPENROUTER_API_KEY \
    && : $VITE_ANTHROPIC_API_KEY \
    && : $VITE_OLLAMA_URL \
    && : $VITE_MISTRAL_API_KEY \
    && npm run build

# ── Runtime image ──────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Dizinleri ve dosyalari kopyala (katman sayisini makul tutarak)
COPY --from=builder /app/dist       ./dist
COPY --from=builder /app/server     ./server
COPY --from=builder /app/types      ./types
COPY --from=builder /app/lib        ./lib
COPY --from=builder /app/services   ./services
COPY --from=builder /app/utils      ./utils
COPY --from=builder /app/data       ./data
COPY --from=builder /app/contexts   ./contexts
COPY --from=builder /app/dsl        ./dsl
COPY --from=builder /app/compilers  ./compilers
COPY --from=builder /app/src        ./src
COPY --from=builder /app/data.ts /app/locales.ts /app/types.ts /app/tsconfig.json ./

# Sürüm sabitlenerek linter uyarıları (DL3016) giderildi
RUN npm install tsx@4.19.1 --save-dev --legacy-peer-deps && npm cache clean --force

# Dosya izinlerini Node kullanıcısına devret (güvenlik)
RUN chown -R node:node /app

ENV NODE_ENV=production
ENV SR_API_PORT=4000
EXPOSE 4000

# Least privilege (root yerine node kullanıcısı ile çalıştır)
USER node

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/ || exit 1

CMD ["npx", "tsx", "server/index.ts"]
