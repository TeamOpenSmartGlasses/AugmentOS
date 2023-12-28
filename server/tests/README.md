# This is how we test convoscope

### To run a test + make a recording of a Lex Fridman podcast:

1. Edit the test_helper.py to point to your backend. Specify a unique userId in test_helper.py. For deviceId, I prefer to use "CSEWebFrontendDefault" as that lines up with the web frontend.
2. (OPTIONAL) To see insights as they come in: Open a web frontend pointed to the same backend, set your userId in the frontend to the same as in your code.
3. Make sure the `tests/lex_whisper_transcripts/` folder is populated with at least one Lex podcast transcript, then run `python record_on_lex.py`.

The script will...:
* Pull a random Lex transcript
* Tell backend to start recording
* Start sending the Lex transcripts to the backend at the times denoted in the transcript file. Because of this, the script will need to run for as long as the original transcript does. If you don't want to wait >1 hour for the entire transcript... well... use shorter transcripts.
* On completion, tells the backend to save the recording
* The recording will be available in `tests/recordings/{recording_name}.json` and `server/recordings/{recording_name}.json`

#### To use the recording in the study frontend ####

1. Copy the recording's json file into the `web_frontend/public/` folder.
2. Rename the recording's json file's name to match the name of the corresponding video file 

EX:

```
public/
    test_video.mp4
    test_video.json
```

3. Also, make sure to specify the video name in `web_frontend/constants.ts`

EX:

```
export const VIDEO_SRC = "test_video.mp4";
```

### (OLD) To run a test on a Lex Fridman podcast:

1. Edit the test_helper.py to point to your backend. Specify a unique userId in test_helper.py. Change the PLAYBACK_SPEED to whatever speed you use.
2. Open a new frontend pointed to the same backend, set your userId in the frontend to the same as in your code.
3. Run `python3 test_real_time_transcripts.py`.
4. This will ask for a path to your transcript file, paste it in.
5. Then it will ask for a time. Give the time you're starting in seconds. Wait to press enter...
6. Click play on the video in Youtube and then immediately press Enter in the terminal.
