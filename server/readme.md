# Node.js server for fetching Speech token using API credentials

Server has one API endpoint that can be accessed at the moment from anywhere, CORS policies is allowed.

When starting with the project run `npm i`

Run development environment
`npm run start:dev`

Run build (build ts to js), built JavaScript file can be found from folder "build"
`npm run build`

Run production app. When building the production app, we remove the old build folder and create new one.
`npm run start:prod`

API endpoint
`http://localhost:8080/api/get-speech-token`