# Dockerfile for running ipns-publisher service.
# CircleCI just gives us a nice Node image; this isn't for CI.
FROM cimg/node:16.14.2
USER circleci
RUN mkdir -p /home/circleci/app
WORKDIR /home/circleci/app
COPY --chown=circleci:circleci package*.json ./
COPY --chown=circleci:circleci src ./src
EXPOSE 8000
RUN npm install
CMD [ "npm", "start" ]
