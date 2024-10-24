import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoPage.css'; // Import the CSS file for styling
import withUserName from '../hoc/withUserName';

const VideoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const participantID = localStorage.getItem('participantID');
  const navigate = useNavigate();

  useEffect(() => {
    const sendPlaybackTime = () => {
      if (videoRef.current && participantID) {
        const currentTime = videoRef.current.currentTime;
        console.log(currentTime)
        axios
          .post('http://localhost:8000/playback/api/update-playback-time/', {
            participantID,
            videoID: id,
            currentTime,
          })
          .catch((error) => {
            console.error('Error sending playback time:', error);
          });
      }
    };

    const handleVideoEnded = () => {
      // Navigate to post-test page after video ends
      navigate(`/posttest/${id}`);
    };

    const videoElement = videoRef.current;

    if (videoElement) {
      videoElement.addEventListener('ended', handleVideoEnded);
    }

    const interval = setInterval(sendPlaybackTime, 10); // Send every 1 second

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('ended', handleVideoEnded);
      }
      clearInterval(interval);
    };
  }, [id, participantID, navigate]);

  return (
    <div className="video-container">
      <h1 className="video-title">Video {id}</h1>
      <video ref={videoRef} width="600" controls preload="auto" className="video-player">
        <source src={`/videos/video_${id}.mp4`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default withUserName(VideoPage);
