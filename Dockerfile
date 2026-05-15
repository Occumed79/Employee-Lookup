# Stage 1: Build
FROM node:20-alpine as build

# Set working directory
WORKDIR /usr/src/app

# Copy package manager lock file and configuration
COPY pnpm-workspace.yaml ./
COPY .npmrc ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy all workspace projects
COPY ./ ./

# Use pnpm to install (multi-stage caches dependencies)
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build the app
RUN pnpm run build

# Stage 2: Run
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy built files from Stage 1
COPY --from=build /usr/src/app ./

# Only expose if backend needs ports for a server
EXPOSE 8080

# Entry point (configurable per server type backend or utils)
CMD ["pnpm", "start"]
