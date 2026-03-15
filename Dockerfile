FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration=production

FROM nginx:alpine  # alpine statt latest → ~25MB statt ~190MB
RUN rm -rf /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/meterflow/browser /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]