from string import punctuation

# explicit_wake_words = [
#     "hey convoscope",

#     "hey conboscope",
#     "hey conbo scope",

#     "hey confoscope",
#     "hey confo scope",

#     "hey confiscope",
#     "hey confi scope",
    
#     "hey condoscope",
#     "hey condo scope",

#     "hey canvascope",
#     "hey canva scope",

#     "hey comvoscope"
#     "hey comvo scope",

#     "hey comboscope",
#     "hey combo scope",

#     "hey comfoscope",
#     "hey comfo scope",

#     "hey comdoscope",
#     "hey comdo scope",

#     "hey convo scope",
# ]

explicit_wake_words = [
    "hey mira",
    "he mira",

    "hey mara",
    "he mara",
]

def does_text_contain_wake_word(transcript):
    transcript_low = transcript.lower()
    for term in explicit_wake_words:
        if term in transcript_low:
            return True
    return False

def get_explicit_query_from_transcript(transcript):
    transcript_low = transcript.lower()
    for term in explicit_wake_words:
        if term in transcript_low:
            index = transcript_low.rfind(term) + len(term)
            base_query = transcript_low[index:]
            return base_query.strip(punctuation).strip()
    return None