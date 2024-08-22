# Use the base image with Node.js
FROM node:21.6.0

# Copy the current directory into the Docker image
COPY . /lookups-api

# Set working directory for future use
WORKDIR /lookups-api

# Install the dependencies from package.json
RUN npm install
RUN npm run lint
#RUN npm run build
#RUN npm run test

CMD [ "node", "app.js" ]
