import React, { useRef, useEffect } from 'react';
import axios from 'axios';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const sendPlaybackTime = () => {
      if (videoRef.current) {
        const currentTime = videoRef.current.currentTime;
        axios.post('http://localhost:8000/playback/update-playback-time/', { currentTime })
          .catch((err: unknown) => {
            if (err instanceof Error) {
              console.error(err.message);
            } else {
              console.error('An unexpected error occurred', err);
            }
          });
      }
    };

    const interval = setInterval(sendPlaybackTime, 100); // Send every 1 second

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <video ref={videoRef} width="600" controls>
        <source src="/20240616_182118.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default App;
