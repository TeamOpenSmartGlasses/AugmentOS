import React, { useState, CSSProperties } from 'react';
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
    } catch (error: any) {
      console.error('Error creating participant:', error);
      setError(`Failed to create participant: ${error.message}`);
    }
  };

  const styles: {
    container: CSSProperties;
    formContainer: CSSProperties;
    form: CSSProperties;
    input: CSSProperties;
    button: CSSProperties;
    message: CSSProperties;
  } = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f9f9f9',
      margin: 0,
    },
    formContainer: {
      textAlign: 'center' as CSSProperties['textAlign'],
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      backgroundColor: '#fff',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    form: {
      marginTop: '15px',
    },
    input: {
      padding: '10px',
      marginBottom: '10px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      width: '100%',
      maxWidth: '300px',
    },
    button: {
      padding: '10px 20px',
      backgroundColor: '#007BFF',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    message: {
      marginTop: '10px',
      fontSize: '14px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h1>Enter Participant ID</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={participantID}
            onChange={(e) => setParticipantID(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.button}>
            Start
          </button>
        </form>
        {error && <p style={{ ...styles.message, color: 'red' }}>{error}</p>}
        {success && <p style={{ ...styles.message, color: 'green' }}>{success}</p>}
      </div>
    </div>
  );
};

export default ParticipantIDPage;
