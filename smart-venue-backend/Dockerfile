FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install production dependencies.
RUN npm install

# Copy local code to the container image.
COPY . .

# Ensure service-account.json is present in the working directory
# (It should already be copied by 'COPY . .', but this makes it explicit)
COPY service-account.json ./

# Build the TypeScript code.
RUN npm run build

# Run the web service on container startup.
CMD [ "npm", "start" ]
