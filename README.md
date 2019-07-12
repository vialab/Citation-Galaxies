# Citation-Galaxies
A web application to view, and markup, citations and their surrounding context

## Getting Started
This project was built as two different servers: 

- NodeJS primarily for frontend
- Python (Flask) primarily for backend data processing

Please ensure that you have docker installed on your system. Both projects are setup to run in docker containers either separately, or using docker compose. By default, these projects run on `port 5432` for the `frontend`, and `port 5000` for the `backend`.

## Running with Docker
Run both `frontend` and `backend` sub-folders as seperate images.

Frontend:
  - Navigate to `/frontend`
  - Build the docker image using `docker build -t cg-frontend .`
  - Run the container with `docker run cg-frontend`

Backend:
  - Navigate to `/backend`
  - Build the docker image using `docker build -t cg-backend .`
  - Run the container with `docker run cg-backend`

By default, the project (frontend) should be accessible through `localhost:5432`

## Running Locally
A connection to the database must be made in order for the proper functioning of this project. Both `frontend` and `backend` will require a connection. Please contact the collaborators of this project for access to the database.
  
Backend:
  - Create a file in the `/backend` sub-folder with the name `database.ini`
  - Paste the following into the `database.ini` file, edit the values as appropriate and save
  `[postgresql]
  host=<host>
  database=citationdb
  user=citationdb
  password=<password>
  `
  - You may now run this project as you would for a regular FLASK project
  - Example:
  `#!/bin/bash
  echo "Starting python server.."
  source venv/bin/activate
  export FLASK_APP=server.py
  export DEPLOY_ENV=TEST
  flask run --port=5000
  echo "Python listening on http://localhost:5000"
  `

Frontend: 
  - First navigate to the `/frontend` sub-folder in your terminal
  - Run the command `npm install`
  - Running the frontend project will require environment variables be set available to the nodejs project, and so we would recommend you to write your own bash script to handle this (or whatever is available for your respective system)
  - Example:
  `#!/bin/bash
  DATABASE_URL="postgresql://citationdb:<password>@<host>:<port>/citationdb" DEPLOY_ENV="PROD" node index.js
  `
  
Alternatively, you may edit the Dockerfiles as you see fit for your setup. However, please DO NOT commit/push any changes to the Dockerfiles unless you know what you are doing.

## Deployment
Deployment for this project has been automated, and so please be aware that pushes to this repository will automatically build, run, and deploy to the VIALAB production servers at https://citation.vialab.ca/. Deployment will automatically handle database connections, as well as mount volumes to hold the larger files not part of the github repository (citation caching and word2vec models) through Kubernetes.

In order to ensure the appropriate database connections are made, committed versions of this project should always have `ENV DEPLOY_ENV PROD` in line 6 of the Dockerfile for the `/backend` sub folder.

# License
This research was conducted as part of the CO.SHS project (co-shs.ca) and has received financial support from the Canada Foundation for Innovation (Cyberinfrastructure Initiative – Challenge 1 – First competition).
