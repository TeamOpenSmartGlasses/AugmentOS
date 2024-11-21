import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ParticipantIDPage: React.FC = () => {
  const [participantID, setParticipantID] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Send participant ID to backend to create a folder
      await axios.post('http://localhost:61234/playback/api/create-participant/', {
        participantID,
      });

      // Store participant ID in localStorage for later use
      localStorage.setItem('participantID', participantID);

      // Set success message
      setSuccess('Participant created successfully!');

      // Navigate to pretest page
      navigate('/pretest');
    } catch (error) {
      console.error('Error creating participant:', error);
      // @ts-ignore
      setError(`Failed to create participant: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>Enter Participant ID</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={participantID}
          onChange={(e) => setParticipantID(e.target.value)}
          required
        />
        <button type="submit">Start</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  );
};

export default ParticipantIDPage;