FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY serve.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/serve.json ./serve.json

# Expose port
EXPOSE 3000

# Serve the static files
CMD ["serve", "-s", "dist", "-l", "3000", "--cors"]
