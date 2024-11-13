import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoPage.css';
import withUserName from '../hoc/withUserName';

const VideoPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const participantID = localStorage.getItem('participantID');
  const navigate = useNavigate();

  const [videoIndex, setVideoIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideoIndex = async () => {
    if (!participantID) {
      setError('Participant ID not found. Using default video.');
      setVideoIndex(1);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('http://localhost:8080/playback/api/get-video-index-for-participant/', {
        params: { participantID },
      });

      const { video_index } = response.data;
      setVideoIndex(video_index);
    } catch (err) {
      console.error('Error fetching video index:', err);
      setError('Failed to fetch video index. Using default video.');
      setVideoIndex(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoIndex().then(r => r);
  }, []);

  useEffect(() => {
    if (videoIndex === null) return;

    const sendPlaybackTime = () => {
      if (videoRef.current && participantID) {
        const currentTime = videoRef.current.currentTime;
        console.log(`Current playback time: ${currentTime}s`);
        axios
          .post('http://localhost:8080/playback/api/update-playback-time/', {
            participantID,
            videoID: videoIndex,
            currentTime,
          })
          .catch((error) => {
            console.error('Error sending playback time:', error);
          });
      }
    };

    const handleVideoEnded = () => {
      // Navigate to post-test page after video ends
      navigate(`/posttest/${videoIndex}`);
    };

    const videoElement = videoRef.current;

    if (videoElement) {
      videoElement.addEventListener('ended', handleVideoEnded);
    }

    // Send playback time every second (1000ms)
    const interval = setInterval(sendPlaybackTime, 1000);

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('ended', handleVideoEnded);
      }
      clearInterval(interval);
    };
  }, [videoIndex, participantID, navigate]);

  if (loading) {
    return <div className="loading">Loading video...</div>;
  }

  console.log(videoIndex)

  return (
    <div className="video-container">
      {error && (
        <div className="error">
          {error}
          <span role="img" aria-label="warning">
            ⚠️
          </span>
        </div>
      )}
      {/* Optional: Display video title or other information */}
      {/* <h1 className="video-title">Video {videoIndex}</h1> */}
      <video
        ref={videoRef}
        width="600"
        controls
        preload="auto"
        className="video-player"
        autoPlay
      >
        <source src={`/videos/video_${videoIndex}.mp4`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default withUserName(VideoPage);
