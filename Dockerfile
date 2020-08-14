FROM node:lts

WORKDIR /home/app

COPY ./package.json .
COPY ./yarn.lock .

RUN yarn

COPY . .

CMD [ "node", "index.js" ]