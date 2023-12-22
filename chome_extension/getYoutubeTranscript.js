function getYoutubeTranscript(){
    let text = "None"

    // Super lazy way of getting YT transcripts: just pull them from the video's captions
    // Downside: Captions MUST be enabled for this to work, lol
    const el = document.getElementById('movie_player');
    if (el){
        text = el.innerText;
        text = text.replaceAll("\n", "");
        let lastGoodIndex = text.indexOf("   ") // Multiple spaces = end of caption
        if (lastGoodIndex == -1) lastGoodIndex = text.indexOf(" ") // Could be weird " " char
        if (lastGoodIndex != -1) text = text.substring(0, lastGoodIndex);

        //filter out from timestamp
        const regex = /\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\b/g;
        let match;
        let timestampIndex = -1
        while ((match = regex.exec(text)) !== null) {
            console.log(`Matched "${match[0]}" at index ${match.index}`);
            timestampIndex = match.index;
        }
        if (timestampIndex != -1) text = text.substring(0, timestampIndex);
    }



    chrome.runtime.sendMessage({data: text});
}

getYoutubeTranscript();

//"Received data BG: specific about my companythat yc just doesn't get            7:04 / 40:20•Reasons not to apply"