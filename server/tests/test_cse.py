import requests
import json
import time
import test_on_lex
import multiprocessing

PORT = '8080'
URL = "http://localhost"
URI = URL + ":" + PORT
UI_POLL_ENDPOINT = URI + "/ui_poll"
CHAT_ENDPOINT = URI + "/chat"

TEST_USERID = "testUserId"
TEST_DEVICEID = "testDeviceId"

ui_poll_data = {
      'features': ["contextual_search_engine"],
      'userId': TEST_USERID,
      'deviceId': TEST_DEVICEID,
}

def ui_poll():
    r_poll = requests.post(UI_POLL_ENDPOINT, 
                 data=json.dumps(ui_poll_data))
    json_poll = r_poll.json()
    print(json_poll)
    return json_poll
    
def ui_poll_loop():
    print("=== Begin UI Polling ===")
    while True:
        ui_poll()
        time.sleep(5)

def chat(text, isFinal):
    chat_data = {
      'text': text,
      'userId': TEST_USERID,
      'timestamp': time.time(),
      'isFinal': isFinal,
    }
    r_chat = requests.post(CHAT_ENDPOINT, data=json.dumps(chat_data))
    json_chat = r_chat.json()
    print(json_chat)
    return json_chat

def test_using_lex_transcript():
    print("=== Begin Transcript Uploading ===")
    lex = test_on_lex.load_lex_transcripts(random_n=1)
    for transcript in lex.keys():
        for chunk in lex[transcript]:
            # First, send as intermediate 
            chat(chunk, False)

            time.sleep(1)
            # Then send as final
            chat(chunk, True)
        print("=== Transcript Uploading Complete ===")

    ui_poll_loop()

# ui_poll_process = multiprocessing.Process(target=ui_poll_loop)
# ui_poll_process.start()

test_using_lex_transcript()