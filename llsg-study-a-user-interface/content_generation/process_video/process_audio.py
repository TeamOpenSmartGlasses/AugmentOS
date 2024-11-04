import whisper


model = whisper.load_model("small.en")
transcript = model.transcribe(
    word_timestamps=True,
    audio="video_1.wav",
    fp16=False,
    language="en",

)
for segment in transcript['segments']:
    print(''.join(f"{word['word']}[{word['start']}/{word['end']}]"
                    for word in segment['words']))