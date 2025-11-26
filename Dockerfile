# --- ETAPA 1: CONSTRUCCIÓN (Build) ---
FROM node:20-alpine as build-stage

# Carpeta de trabajo
WORKDIR /app

# Copiamos dependencias y las instalamos
COPY package*.json ./
RUN npm install

# Copiamos el código y construimos la app
COPY . .
RUN npx quasar build --mode spa

# --- ETAPA 2: PRODUCCIÓN (Nginx) ---
FROM nginx:stable-alpine as production-stage

# Copiamos el resultado de la etapa anterior al servidor Nginx
COPY --from=build-stage /app/dist/spa /usr/share/nginx/html

# Exponemos el puerto 80
EXPOSE 80

# Iniciamos el servidor
CMD ["nginx", "-g", "daemon off;"]