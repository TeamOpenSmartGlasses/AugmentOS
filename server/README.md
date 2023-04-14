# Deployment Guide
  1. spin up an ubuntu ec2 instance
  2. give your server an elastic IP
  3. create an API Gateway API
  4. add a `/chat` route to your API, and attach to it an `HTTP-URI` integration with HTTP method `POST` and route `http://<ec2 elastic ip>/chat`
  5. put nginx on your server `sudo apt-get install nginx`
  6. put this in `/etc/nginx/sites-available/default`:
        ```
        server {
            listen 80 default_server;
            listen [::]:80 default_server;

            server_name _;

            location / {
                    proxy_pass http://localhost:8080;
                    proxy_set_header Host $host;
                    proxy_set_header X-Real-IP $remote_addr;
                    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            }
        }
        ```
  7. start nginx `sudo systemctl start nginx`
  8. install the python dependencies: `aiohttp, openai, langchain`
  9. put `server.py` on your server and run it
