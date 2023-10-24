# Setup Frontend

* You can skip all this by cloning locally, installing `pnpm` (or yarn or npm), then navigate to the web_frontend directory and follow the steps below

## Env variables

Setup environment variables (refer to env.local file)
`VITE_BACKEND_BASE_URL` should be set to where your backend is
`VITE_SERVER_ENVIRONMENT` can be set to an endpoint modifier to run multiple servers on the same URL

Example to run on your url and at /api/dev:
```
export VITE_BACKEND_BASE_URL=<your url>; export VITE_SERVER_ENVIRONMENT=dev
```

If you want to run without a special location after /api, then set `VITE_SERVER_ENVIRONMENT=prod` for production (main server).

## Start application

```bash
pnpm install
pnpm dev
```
> Swap out `pnpm` for your package manager (npm / yarn)

## Deployment
1. Give yourself permissions for /var/www/html and then clone this repo to there.
2. cd into the cloned dir, cd into web_frontend, then run `npm build`
3. On the EC2 box you used for the backend (setup backend first), add another nginx config that points to /var/www/html/<this-repos-folder>/web_frontend/build
4. Restart nginx

## Dev details

### Dev stack

This was made with 
- React: frontend framework
- Typescript: Enforce types -> Better readability
- Vite: Development server -> Better developer experience 
- SWC: Speedy web compiler -> Faster compilations
- Mantine UI: A UI library -> Cleaner UI look and very flexible to work with
