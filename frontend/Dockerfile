FROM node

COPY . /usr/src/app
WORKDIR /usr/src/app

RUN npm install

EXPOSE 5432

CMD ["node","index.js"]
