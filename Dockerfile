FROM cimg/node:16.14.2
USER circleci
RUN mkdir -p /home/circleci/app
WORKDIR /home/circleci/app
COPY --chown=circleci:circleci package*.json index.js ./
RUN npm install
CMD [ "npm", "start" ]
