import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const NumberQualitativeQuestions: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const participantID = localStorage.getItem('participantID');
    const Q_R = localStorage.getItem('Q_R');
    const videoIndex = localStorage.getItem('videoIndex');
    const condition = localStorage.getItem('condition');

    const handleSurveyCompletion = () => {
        navigate(`/special_video/`);
    };

    window.addEventListener("message", (event) => {
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
        handleSurveyCompletion();
    } else {
        console.warn("Unrecognized event received:", message.event);
    }
    });

  return (
    <div>
      <h1>Survey</h1>
      <iframe
        src={`https://mit.co1.qualtrics.com/jfe/form/SV_55SFkZAiT7tFxY2?code_block_num=qualitative_num_words&participant_id=${participantID}&Q_R=${Q_R}`}
        title="Survey"
        width="100%"
        height="600px"
        frameBorder="0"
        style={{ border: '2px solid black' }} // Add border here
        onLoad={() => {
          window.addEventListener('message', (event) => {
            if (event.data === 'SurveyCompleted') {
              handleSurveyCompletion();
            }
          });
        }}
      ></iframe>
    </div>
  );
};

export default NumberQualitativeQuestions;