FROM node:16-alpine as base
# Create the user up front to save a little time on rebuilds.
RUN adduser --gecos '' --disabled-password --no-create-home user
ENV NODE_OPTIONS=--max-old-space-size=4096
# Create app directory
RUN mkdir -p /usr/src/nodejs-rest-api
WORKDIR /usr/src/nodejs-rest-api
# Copy deps files
COPY package.json /usr/src/nodejs-rest-api/package.json
COPY yarn.lock /usr/src/nodejs-rest-api/yarn.lock

# BUILD DEPS
FROM base as build-deps
RUN yarn
COPY . /usr/src/nodejs-rest-api
WORKDIR /usr/src/nodejs-rest-api
RUN yarn build

# START API
FROM base as prod-stage
COPY --from=build-deps /usr/src/nodejs-rest-api/dist ./dist
RUN yarn --production
CMD ["yarn", "start"]


