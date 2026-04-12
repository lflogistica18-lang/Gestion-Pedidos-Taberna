FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

# Copiamos los archivos compilados a la carpeta html de NGINX
COPY --from=builder /app/dist /usr/share/nginx/html

# Sobreescribimos la configuracion por defecto para rutear todo a index.html (SPA)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
