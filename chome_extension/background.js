import { backendUrl, chatEndpoint } from './constants.js'

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

function sendTranscriptToConvoscope(transcript) {
  
  let isFinal = true;
  let url = chatEndpoint;
  let data = {
    text: transcript,
    userId: "testUserId",
    timestamp: Date.now(),
    isFinal,
  };

  fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(data => {
      console.log('Success:', data);
  })
  .catch((error) => {
      console.error('Error:', error);
  });
};

var previousYtTranscript = ""

// Triggers on new YT transcript
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.data) {
        // Do something with the data
        if (message.data != previousYtTranscript)
        {
          // Send message to server
          console.log("Received new transcript: " + message.data);
          sendTranscriptToConvoscope(message.data);
          previousYtTranscript = message.data;
        }  
    }
    return true;
});

// Maybe fetch new YT Transcripts
setInterval(() => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let activeTab = tabs[0];

    if (!activeTab) return;
    if (activeTab.url && activeTab.url.indexOf("youtube.com/watch?v=") == -1) return;

    chrome.scripting.executeScript({
      target: {tabId: activeTab.id},
      files: ['getYoutubeTranscript.js']
    }, (results) => {
      //sendResponse({result: "Script Executed"});
      // console.log("results")
    });
  });
}, 500)