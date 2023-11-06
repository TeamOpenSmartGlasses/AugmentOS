# This is how we test convoscope

### To run a test on a Lex Fridman podcast:

1. Edit the test_helper.py to point to your backend. Specify a unique userId in test_helper.py. Change the PLAYBACK_SPEED to whatever speed you use.
2. Open a new frontend pointed to the same backend, set your userId in the frontend to the same as in your code.
3. Run `python3 test_real_time_transcripts.py`.
4. This will ask for a path to your transcript file, paste it in.
5. Then it will ask for a time. Give the time you're starting in seconds. Wait to press enter...
6. Click play on the video in Youtube and then immediately press Enter in the terminal.
