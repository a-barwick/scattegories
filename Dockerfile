# Use the official Node.js image as the base image
FROM node:21

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files to the working directory
COPY . .

# Build the TypeScript project
RUN npm run prod-build

# Expose the port on which your app will run (replace 3000 with your actual port)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]