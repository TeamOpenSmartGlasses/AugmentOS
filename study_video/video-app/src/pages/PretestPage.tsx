import React from 'react';
import { useNavigate } from 'react-router-dom';
import withUserName from '../hoc/withUserName';

const PretestPage: React.FC = () => {
  const navigate = useNavigate();

  // Function to handle survey completion
  const handleSurveyCompletion = () => {
    // Navigate to the first video
    navigate('/video/1');
  };

  return (
    <div>
      <h1>Pre-test</h1>
      <iframe
        src="https://your.qualtrics.survey.link?redirectUrl=http://localhost:3000/video/1"
        title="Pre-test Survey"
        width="100%"
        height="600px"
        frameBorder="0"
        onLoad={() => {
          // Listen for messages from Qualtrics
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

export default withUserName(PretestPage);
