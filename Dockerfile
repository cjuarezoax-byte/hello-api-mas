# Etapa única, sencilla, basada en Node 20
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Copiar solo package.json y package-lock.json primero
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --omit=dev

# Copiar el resto del código de la app
COPY . .

# Exponer el puerto (coincide con PORT en .env / Azure)
EXPOSE 3000

# Comando de arranque
CMD ["npm", "start"]
