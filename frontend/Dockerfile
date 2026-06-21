# Stage 1: Build React static assets
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# Embed build-time variables needed by Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Production server
FROM nginx:alpine

# Copy built files to Nginx html folder
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Copy custom Nginx conf to support routing and reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
