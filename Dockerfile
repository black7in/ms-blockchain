# ============================================
# STAGE 1: DEPENDENCIAS (cache layer)
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar solo archivos de dependencias para cache de npm
COPY package.json package-lock.json* ./

# Instalar TODAS las dependencias (incluye devDependencies para build)
RUN npm ci --legacy-peer-deps

# ============================================
# STAGE 2: BUILD (compilacion TypeScript)
# ============================================
FROM node:20-alpine AS build
WORKDIR /app

# Copiar node_modules desde deps (cache)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compilar NestJS
RUN npm run build

# Verificar que dist/ existe
RUN test -d dist || (echo "ERROR: build fallo" && exit 1)

# ============================================
# STAGE 3: PRODUCCION (imagen minima)
# ============================================
FROM node:20-alpine AS production
WORKDIR /app

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copiar solo dependencias de produccion
COPY package.json package-lock.json* ./
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copiar build compilado
COPY --from=build /app/dist ./dist

# Cambiar a usuario no-root
USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/main"]

# ============================================
# STAGE 4: DESARROLLO (hot reload)
# ============================================
FROM node:20-alpine AS development
WORKDIR /app

# Instalar dependencias globales para hot reload
RUN npm install -g @nestjs/cli

# Copiar package files y instalar TODO
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copiar codigo fuente
COPY . .

EXPOSE 3001

# Hot reload con watch mode
CMD ["npm", "run", "start:dev"]
