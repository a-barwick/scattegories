FROM node:21
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run prod-build
EXPOSE 3000
CMD ["npm", "run", "start"]