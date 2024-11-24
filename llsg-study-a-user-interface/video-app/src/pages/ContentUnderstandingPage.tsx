import React, {useEffect} from 'react';
import { useParams, useNavigate } from 'react-router-dom';


const ContentUnderstandingPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const participantID = localStorage.getItem('participantID');
    const Q_R = localStorage.getItem('Q_R');
    const videoIndex = localStorage.getItem('videoIndex');
    const condition = localStorage.getItem('condition');

    const handleSurveyCompletion = () => {
        // Assuming there are 3 videos
        let videoCount = parseInt(localStorage.getItem('videoCount') || '0', 0);
        videoCount++;
        console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
        console.log("Video Count:", videoCount);
        if (videoCount < 3) {
            localStorage.setItem('videoCount', videoCount.toString());
            navigate(`/video/`);
        } else {
            navigate(`/qualitative_overall/`);
        }
    };

    useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        const message = event.data;

        console.log("Event origin:", event.origin);
        console.log("Event data:", event.data);
        console.log("Message received:", message);

        if (message.event === "qualtricsBlockCompleted") {
            const { participant_id, block_completed, Q_R } = message.data;

            console.log("Qualtrics block completed:", block_completed);
            console.log("Q_R received:", Q_R);
            console.log("participant_id received:", participant_id);

            localStorage.setItem("Q_R", Q_R);

            // Retrieve existing session data or initialize if not present
            const sessionData = JSON.parse(localStorage.getItem("participantSession") || "{}");

            // Update session data
            const updatedSession = {
                participant_id: participant_id || sessionData.participant_id, // Ensure participant_id persists
                Q_R: Q_R || sessionData.Q_R, // Ensure Q_R persists
                completed_blocks: [...(sessionData.completed_blocks || []), block_completed],
            };

            // Save updated session to localStorage
            localStorage.setItem("participantSession", JSON.stringify(updatedSession));

            // Proceed to the next block or action
            // if (block_completed.includes("understanding")) {
            handleSurveyCompletion();
            // }
        } else {
            console.warn("Unrecognized event received:", message.event);
        }
    };

    window.addEventListener("message", handleMessage);

    return () => {
        window.removeEventListener("message", handleMessage);
    };
}, []);
    console.log("Participant ID:", participantID);
    console.log("VideoIndex:", videoIndex);

  return (
    <div>
      <h1>Post-test for Video {id}</h1>
      <iframe
        src={`https://mit.co1.qualtrics.com/jfe/form/SV_3lwhnSHD7NXq41E?code_block_num=understanding_${videoIndex}&participant_id=${participantID}&Q_R=${Q_R}`}
        title="Post-test Survey"
        width="100%"
        height="600px"
        frameBorder="0"
        style={{ border: '2px solid black' }} // Add border here
      ></iframe>
    </div>
  );
};

export default ContentUnderstandingPage;