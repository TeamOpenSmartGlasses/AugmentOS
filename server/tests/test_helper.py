import requests
import json
import time
import test_on_lex
import multiprocessing

# TEST_USERID = "caydenLexTester"
# TEST_DEVICEID = "testDeviceId"

TEST_USERID = "testUserId"
TEST_DEVICEID = "CSEWebFrontendDefault"

# server_endpoint = '/dev2'
# URL = "https://vpmkebx0cl.execute-api.us-east-2.amazonaws.com/api"

server_endpoint = ''
URL = "http://localhost:8080"

# server_endpoint = ''
# URL = "http://localhost:8080"

URI = URL + server_endpoint
UI_POLL_ENDPOINT = URI + "/ui_poll"
CHAT_ENDPOINT = URI + "/chat"
START_RECORDING_ENDPOINT = URI + "/start_recording"
SAVE_RECORDING_ENDPOINT = URI + "/save_recording"
LOAD_RECORDING_ENDPOINT = URI + "/load_recording"
PLAYBACK_SPEED = 2

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

# Like `ui_poll_loop`, but ends when there are no results after `timeout` seconds
def ui_poll_loop_with_timeout(timeout = 60):
    print(f"=== Begin UI Polling w/ {timeout} second timeout ===")
    latest_result_time = time.time()
    while time.time() < latest_result_time + timeout:
        results = ui_poll()
        if results['result']: latest_result_time = time.time()
        time.sleep(5)

def chat(text, isFinal):
    chat_data = {
      'text': text,
      'userId': TEST_USERID,
      'timestamp': time.time(),
      'isFinal': isFinal,
    }
    print(CHAT_ENDPOINT)
    print(chat_data)
    r_chat = requests.post(CHAT_ENDPOINT, data=json.dumps(chat_data))
    json_chat = r_chat.json()
    print(json_chat)
    return json_chat

def test_on_text(text: str):
    chat(text, False)
    time.sleep(0.5)
    chat(text, True)

def start_recording():
    data = {'userId': TEST_USERID}
    r = requests.post(START_RECORDING_ENDPOINT, data=json.dumps(data))
    r_json = r.json()
    print(r_json)
    return r_json

def save_recording(recording_name: str = "testRecording"):
    data = {'userId': TEST_USERID, 'recordingName': recording_name}
    print("DATA:")
    print(str(data))
    r = requests.post(SAVE_RECORDING_ENDPOINT, data=json.dumps(data))
    r_json = r.json()
    print(r_json)
    return r_json

def load_recording(recording_name: str = "testRecording"):
    data = {'recordingName': recording_name}
    r = requests.post(LOAD_RECORDING_ENDPOINT, data=json.dumps(data))
    r_json = r.json()
    print(r_json)
    return r_json
    
if __name__ == "__main__":
    test_on_text("Hey Convoscope, do cars generally have 4 wheels?")

# ui_poll_process = multiprocessing.Process(target=ui_poll_loop)
# ui_poll_process.start()
# test_using_lex_transcript()
