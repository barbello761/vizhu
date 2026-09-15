FROM node:20-alpine AS builder
# build — прод; build:demo — демо-стенд (infra/demo). ARG'и видны RUN как
# переменные окружения, а они у vite приоритетнее файлов .env.*.
ARG BUILD_SCRIPT=build
ARG VITE_DEMO_OTP_CODE
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run ${BUILD_SCRIPT}

FROM nginx:1.25-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
