import os
import glob
import webvtt
from datetime import datetime
import random

def load_lex_transcripts(random_n = None, transcript_folder = "./lex_whisper_transcripts", chunk_time_seconds=120):
    podcast_transcript_chunks = dict() # dict of lists
    last_time = None
    dt_format = "%H:%M:%S.%f"

    #filter to large model outputs
    convo_files = list(glob.glob(transcript_folder + "/*large*"))

    if random_n is not None:
        convo_files = random.sample(convo_files, min(len(convo_files), random_n))

    for f in convo_files:
        #name convo the basename without extension of the file
        convo_name = os.path.splitext(os.path.basename(f))[0]
        podcast_transcript_chunks[convo_name] = list()
        print("Processing {}...".format(convo_name))
        for caption in webvtt.read(f):
            start_time = datetime.strptime(caption.start, dt_format)
            if last_time is None or (start_time - last_time).seconds > chunk_time_seconds:
                last_time = start_time
                podcast_transcript_chunks[convo_name].append(caption.text)
            else:
                podcast_transcript_chunks[convo_name][-1] += caption.text
    return podcast_transcript_chunks
    
if __name__ == "__main__":
    print(load_lex_transcripts(random_n=3))
    d = load_lex_transcripts(random_n=3)
    print(d.keys())
    for l in d.keys():
        print(d) 
