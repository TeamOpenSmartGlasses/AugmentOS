import pandas as pd
from moviepy.editor import VideoFileClip
from PIL import Image, ImageDraw
import numpy as np


def read_time_ranges_from_csv(csv_file, fps):
    df = pd.read_csv(csv_file)
    time_ranges = []
    for _, row in df.iterrows():
        start_time = row['start_time']
        end_time = row['end_time']
        start_frame = int(start_time * fps)
        end_frame = int(end_time * fps)
        time_ranges.append([start_frame, end_frame])
    return time_ranges


def add_square(frame, frame_number, time_ranges):
    img = Image.fromarray(frame)
    draw = ImageDraw.Draw(img)

    square_size = 200
    square_color = (0, 0, 0)
    draw.rectangle([0, 0, square_size, square_size], fill=square_color)

    for start_frame, end_frame in time_ranges:
        if start_frame <= frame_number <= end_frame:
            white_square_size = 150
            white_square_color = (255, 255, 255)
            draw.rectangle([0, 0, white_square_size, white_square_size], fill=white_square_color)
            break

    return np.array(img)


csv_file_path = "../rare_words_with_timestamps_and_conditions/article_1_5_percent_rare_words_with_timestamps_and_conditions.csv"
video_clip = VideoFileClip("./videos/video_1.mp4")
fps = video_clip.fps
time_ranges = read_time_ranges_from_csv(csv_file_path, fps)

modified_clip = video_clip.fl_image(
    lambda frame: add_square(frame, int(video_clip.reader.pos), time_ranges)
)

modified_clip.write_videofile(
    "../../video-app/public/videos/video_1.mp4",
    codec="libx264",
    audio=True,
    audio_codec="aac",
    fps=video_clip.fps,
    preset="ultrafast", # remove for production
    ffmpeg_params=["-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2"]
)