import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoPage.css';

const SpecialVideoPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const participantID = localStorage.getItem('participantID');
  const Q_R = localStorage.getItem('Q_R');
  const navigate = useNavigate();

  const [videoStarted, setVideoStarted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial POST request to 'special_video/' endpoint
  useEffect(() => {
    axios.post('http://localhost:61234/playback/api/special_video/')
      .catch((error) => {
        console.error('Error sending special video request:', error);
        setError('Failed to initiate special video.');
      });
  }, []);

  // Effect to handle video playback and related event listeners
  useEffect(() => {
    const sendPlaybackTime = () => {
      if (videoRef.current && participantID) {
        const currentTime = videoRef.current.currentTime;
        console.log(`Current playback time: ${currentTime}s`);
        axios
          .post('http://localhost:61234/playback/api/update-playback-time/', {
            participantID,
            currentTime,
          })
          .catch((error) => {
            console.error('Error sending playback time:', error);
          });
      }
    };

    const handleVideoEnded = () => {
      navigate(`/qualitative_overall/`);
    };

    const handlePause = () => {
      if (videoStarted && videoRef.current) {
        videoRef.current.play().catch((error) => {
          console.error('Error replaying video after pause:', error);
        });
      }
    };

    const videoElement = videoRef.current;

    if (videoElement) {
      videoElement.addEventListener('ended', handleVideoEnded);
      videoElement.addEventListener('pause', handlePause);
    }

    // Send playback time every second (1000ms)
    const interval = setInterval(sendPlaybackTime, 1000);

    // Cleanup function
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('ended', handleVideoEnded);
        videoElement.removeEventListener('pause', handlePause);
      }
      clearInterval(interval);
    };
  }, [participantID, navigate, videoStarted]);

  // Event handler for spacebar press to start the video
  const handleSpacebarPress = (event: KeyboardEvent) => {
    if (event.code === 'Space' && !videoStarted) {
      event.preventDefault(); // Prevent default spacebar behavior like scrolling
      setVideoStarted(true);
    }
  };

  // Event handler for secret key press ('S') to skip video
  const handleSecretKeyPress = (event: KeyboardEvent) => {
    if (event.code === "KeyS") {
      if (videoRef.current) {
        videoRef.current.currentTime = videoRef.current.duration - 1; // Skip to the end
        console.log('Secret key pressed: Skipping to the end of the video.');
      }
    }
  };

  // Add event listeners for key presses
  useEffect(() => {
    window.addEventListener('keydown', handleSpacebarPress);
    window.addEventListener('keydown', handleSecretKeyPress);

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleSpacebarPress);
      window.removeEventListener('keydown', handleSecretKeyPress);
    };
  }, [videoStarted]);

  // Effect to play the video once it has started
  useEffect(() => {
    if (videoStarted && videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error('Error playing video:', error);
      });
      // Set a standard playback rate
      videoRef.current.playbackRate = 1.0;
    }
  }, [videoStarted]);

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
        <source src={`/videos/special_video.mp4`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default SpecialVideoPage;