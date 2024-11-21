import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoPage.css';

const VideoPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const participantID = localStorage.getItem('participantID');
  const Q_R = localStorage.getItem('Q_R');
  const navigate = useNavigate();

  const [videoIndex, setVideoIndex] = useState<number | null>(null);
  const [condition, setCondition] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [videoStarted, setVideoStarted] = useState<boolean>(false);

  const fetchVideoIndex = async () => {
    if (!participantID) {
      setError('Participant ID not found. Using default video.');
      setVideoIndex(1);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('http://localhost:61234/playback/api/get-video-index-for-participant/', {
        params: { participantID },
      });

      const { video_index, condition } = response.data;
      setVideoIndex(video_index);
      setCondition(condition);

      localStorage.setItem('videoIndex', video_index);
      localStorage.setItem('condition', condition);
    } catch (err) {
      console.error('Error fetching video index:', err);
      setError('Failed to fetch video index. Using default video.');
      setVideoIndex(1);
    } finally {
      setLoading(false);
    }
    console.log("Video Index:", videoIndex);
  };


  useEffect(() => {
    console.log("%%%%%%%%%%%%%%%^&&&&&&&&&&&&")
    fetchVideoIndex();
  }, []); // Empty dependency array ensures this runs only once

  useEffect(() => {
    if (videoIndex === null) return;

    const sendPlaybackTime = () => {
      if (videoRef.current && participantID) {
        const currentTime = videoRef.current.currentTime;
        console.log(`Current playback time: ${currentTime}s`);
        axios
          .post('http://localhost:61234/playback/api/update-playback-time/', {
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
      navigate(`/tlx/`);
    };

    const videoElement = videoRef.current;

    if (videoElement) {
      videoElement.addEventListener('ended', handleVideoEnded);

      // Disable pausing once the video starts
      const handlePause = () => {
        if (videoStarted) {
          videoElement.play().catch((error) => {
            console.error('Error replaying video after pause:', error);
          });
        }
      };
      videoElement.addEventListener('pause', handlePause);

      // Cleanup event listeners
      return () => {
        videoElement.removeEventListener('ended', handleVideoEnded);
        videoElement.removeEventListener('pause', handlePause);
      };
    }

    // Send playback time every second (1000ms)
    const interval = setInterval(sendPlaybackTime, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [videoIndex, participantID, navigate, videoStarted]);

  const handleSpacebarPress = (event: KeyboardEvent) => {
    if (event.code === 'Space' && !videoStarted) {
      event.preventDefault(); // Prevent default spacebar behavior like scrolling
      setVideoStarted(true);
    }
  };

  const handleSecretKeyPress = (event: KeyboardEvent) => {
    if (event.code === "KeyS") {
      if (videoRef.current) {
        videoRef.current.currentTime = videoRef.current.duration - 1; // Skip to the end
        console.log('Secret key pressed: Skipping to the end of the video.');
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleSpacebarPress);
    window.addEventListener('keydown', handleSecretKeyPress);

    return () => {
      window.removeEventListener('keydown', handleSpacebarPress);
      window.removeEventListener('keydown', handleSecretKeyPress);
    };
  }, [videoStarted]);

  // New useEffect to handle playing the video after it's rendered
  useEffect(() => {
    if (videoStarted && videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error('Error playing video:', error);
      });
      videoRef.current.playbackRate = 2.0;
    }
  }, [videoStarted]);

  if (loading) {
    return <div className="loading">Loading video...</div>;
  }

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
      {!videoStarted && (
        <div className="start-message" style={{ color: 'white' }}>
          You are about to watch a video. Please press the spacebar to begin.
        </div>
      )}
      <video
        ref={videoRef}
        width="600"
        preload="auto"
        className="video-player"
        style={{ display: videoStarted ? 'block' : 'none' }}
      >
        <source src={`/videos/video_${videoIndex}.mp4`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPage;