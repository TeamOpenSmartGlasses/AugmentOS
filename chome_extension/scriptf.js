console.log('Convoscope for YouTube running...')

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.data) {
        console.log("Received data2: " + message.data);
        // Got transcript
    }
});

document.addEventListener('DOMContentLoaded', function () {
    var toggleButton = document.getElementById('toggle-button');
    toggleButton.addEventListener('click', function () {
        console.log("WAHJDIAWCDAW")
        var sidebar = document.getElementById('mySidebar');
        if (sidebar.style.display === 'none' || sidebar.style.display === '') {
            sidebar.style.display = 'block';
        } else {
            sidebar.style.display = 'none';
        }
    });
});