### Building Neuroglancer
The Neuroglancer code is a set of Node (Typescript) files that need to be compiled
into regular javascript with npm. Npm has many versions and is easiest to 
use with another tool called [nvm](https://github.com/nvm-sh/nvm)
Here are the steps to install nvm and then npm:
1. Get and install nvm with this command:
 `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash`
1. This will modify your .bashrc file. Make sure it is installed with:
`command -v nvm` That will just print nvm below the cursor.
1. install the latest npm with: `nvm install --latest-npm`
1. find which npm versions are available with: `nvm list`
1. install node packages with: `npm i` (sudo might be required)
1. You can now build Neuroglancer. Go into the top Neuroglancer directory and
do: `npm run build-min` This will build all the files in ./dist/min
1. Copy all the files from ./dist/min to a location under the document root in Apache.
If it is say: /var/www/html/ng do: `rsync -auv --delete ./dist/min/ /var/www/html/ng/`

