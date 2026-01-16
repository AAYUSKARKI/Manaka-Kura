FROM node:lts-slim

WORKDIR /src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 8000

CMD ["npm","run","dev"]