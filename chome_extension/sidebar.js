const frontendUrl = "http://localhost:5173";

if ('background' in navigator) {
    navigator.serviceWorker.register('/background.js')
      .then(function(registration) {
        console.log('Service Worker registered with scope:', registration.scope);
        alert("1")
        })
      .catch(function(error) {
        console.log('Service Worker registration failed:', error);
        alert("2")
      });
}

function sendMessageToServiceWorker(message) {
    navigator.serviceWorker.controller.postMessage(message);
}

function loadConvoscope(){
   //if (isConvoscopeRunning()) return;

   let convoscopeFrame = document.getElementById("convoscopeFrame");
   convoscopeFrame.src = frontendUrl;
   convoscopeFrame.style.display = "block";

   // Tell background to start sending transcripts
    var data = { key: 'value' }; // Replace with your data
    chrome.runtime.sendMessage(data, function(response) {
        console.log('Received response:', response);
        alert("hi")
    });

    // also start recording
}

function stopConvoscope(){
    //if (!isConvoscopeRunning()) return;

    let convoscopeFrame = document.getElementById("convoscopeFrame");
    convoscopeFrame.src = "";
    convoscopeFrame.style.display = "none";
}

function isConvoscopeRunning(){
    let convoscopeFrame = document.getElementById("convoscopeFrame");
    if (convoscopeFrame == null || convoscopeFrame.src.length < 2) return false;
    return true;
}

document.addEventListener('DOMContentLoaded', function () {
    var toggleButton = document.getElementById('toggle-button');
    toggleButton.addEventListener('click', function () {
        loadConvoscope();
    });
});

stopConvoscope();
