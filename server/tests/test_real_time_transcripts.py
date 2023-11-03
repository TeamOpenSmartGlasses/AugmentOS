# How to use:
# Run the script and specify the path of the transcript file.
# 
# To get results to appear on the frontend, you need to change the parameters in the test_helper.py file. UserId and DeviceId can be found in the journalctl logs, then the endpoint is just the server api url

import time
import webvtt
from test_helper import *

def test_transcripts_in_realtime(file_path):
    captions = webvtt.read(file_path)
    start_time = time.time()

    for caption in captions:
        start = timestamp_to_seconds(caption.start)
        end = timestamp_to_seconds(caption.end)

        # Wait until the start time
        while time.time() - start_time < start:
            time.sleep(0.01)

        # Send transcript to server
        print(caption.text)
        chat(caption.text, True)

        # Wait until the end time
        while time.time() - start_time < end:
            time.sleep(0.01)

        # Get the response from the server
        ui_poll()

def timestamp_to_seconds(timestamp):
    parts = timestamp.split(":")
    
    if len(parts) == 3:  # format is "HH:MM:SS.sss"
        hours, minutes, rest = parts
    else:  # format is "MM:SS.sss"
        hours = 0
        minutes, rest = parts

    seconds, milliseconds = rest.split(".")
    total_seconds = int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(milliseconds) * 0.001
    return total_seconds

if __name__ == "__main__":
    file_path = input("Enter the path to the VTT file: ")
    test_transcripts_in_realtime(file_path)