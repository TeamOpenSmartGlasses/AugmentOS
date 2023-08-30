# Setup Frontend
* You can skip all this by cloneing locally, installing `npm`, then running `npm i` then `npm start` in the web_frontend directory.
 
1. Give yourself permissions for /var/www/html and then clone this repo to there.
2. cd into the cloned dir, cd into web_frontend, then run `npm build`
3. On the EC2 box you used for the backend (setup backend first), add another nginx config that points to /var/www/html/<this-repos-folder>/web_frontend/build
4. Restart nginx
