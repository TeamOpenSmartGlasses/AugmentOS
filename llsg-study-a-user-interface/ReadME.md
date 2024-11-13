## Frontend    
1. move video_1.mp4 to ./llsg-study-a-user-interface/video-app/public/videos
2. cd llsg-study-a-user-interface/video-app/src
3. npm install
4. npm start

## Backend
1. cd llsg-study-a-user-interface/backend 
2. python -m venv venv
3. source venv/bin/activate
4. pip install -r requirements.txt
5. python manage.py migrate
6. python manage.py runserver


then navigate to http://localhost:3000/video/1 on the browser