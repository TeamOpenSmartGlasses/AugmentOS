import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import withUserName from '../hoc/withUserName';

let numberOfVideos = 3;

const PosttestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleSurveyCompletion = () => {
    const nextVideoID = parseInt(id as string) + 1;
    // Assuming there are 3 videos
    if (nextVideoID <= numberOfVideos) {
      navigate(`/video/${nextVideoID}`);
    } else {
      navigate('/completion');
    }
  };

  return (
    <div>
      <h1>Post-test for Video {id}</h1>
      <iframe
        src={`https://your.qualtrics.posttest.link?videoID=${id}&redirectUrl=http://localhost:3000/video/${parseInt(id as string) + 1}`}
        title="Post-test Survey"
        width="100%"
        height="600px"
        frameBorder="0"
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

export default withUserName(PosttestPage);