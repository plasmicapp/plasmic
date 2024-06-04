FROM node:18.19.0

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    npm install -g @plasmicapp/cli create-plasmic-app && \
    yarn install && \
    yarn cache clean && \
    apt-get purge -y --auto-remove git && \
    rm -rf /var/lib/apt/lists/*

# Copy the rest of the application code
COPY . .

# Run tests
CMD ["yarn", "test", "--runInBand"]