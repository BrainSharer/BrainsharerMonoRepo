# Brainsharer Repository
This repository contains three separate projects:
### Angular front end
* This is the angular project that the public views when visiting the brainsharer site.
* The code is located under the angular_frontend directory
### Django 
* This is the Django project that controls the admin database portal and also serves the REST API
* The code is located under the django_api directory
### Neuroglancer
* This is the Brainsharer fork of the Neuroglancer project.
* The code is located under the neuroglancer directory
#### Running a local version of Neuroglancer
1. Clone this repo onto your local machine
1. Get the firebase.ts file from Edward or Duane and place it under: src/neuroglancer/services/
1. Install npm on your local machine. I recommend using nvm ( https://dev.to/ms314006/how-to-install-npm-through-nvm-node-version-manager-5gif )
1. Go to the neuroglancer directory and run: <code>npm run local-server</code> This will run Neuroglancer under port 8080
1. Go to http://localhost:8080
1. You won't have a database server yet so some of the functionality will be missing. You can still load images though.
1. In neuroglancer, go to the source tab and load: https://imageserv.dk.ucsd.edu/data/DK37/neuroglancer_data/C1T This is a good test brain.
1. With no database running, you won't be able to create annotations. You'll need to connect to a  database
