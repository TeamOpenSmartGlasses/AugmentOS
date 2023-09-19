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
9. Enable Google Natural Language Processing API, Maps API, point `gcp_config.py` to point to your Google Project
10. Download the embeddings by running `./downloadEmbeddings.sh`
11. Run `python3`, `import nltk`, `nltk.download('wordnet')`
12. Set your OpenAI API key - `export OPENAI_API_KEY=myKeyHere`
13. put `server.py` on your server and run it

# Get Data

Data sources used for `english_word_freq_list`:
- Google: https://github.com/garyongguanjie/entrie/blob/main/unigram_freq.csv or https://www.kaggle.com/datasets/rtatman/english-word-frequency (there are other mirrors as well)
- Norvig: https://github.com/arstgit/high-frequency-vocabulary (30k.txt, change to .csv and add a single line at the top that just says "word" (CSV header))

# Parse Bookmarks
If you want to parse your bookmarks, use the `parse_bookmarks.py` file (see comment on top of that file for usage).
