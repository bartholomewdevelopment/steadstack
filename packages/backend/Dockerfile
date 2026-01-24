# Use the official Node.js runtime as a base image
FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy app source
COPY . .

# Cloud Run sets PORT environment variable
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the server
CMD ["node", "src/index.js"]
