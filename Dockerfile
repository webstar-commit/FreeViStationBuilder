FROM node:boron

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
RUN cp -r ./public_styles ./node_modules/public/
RUN npm run build

EXPOSE 3008
CMD [ "npm", "start" ]
