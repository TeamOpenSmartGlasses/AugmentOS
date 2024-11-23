import React, { useEffect } from 'react';
import axios from 'axios';

const CompletionPage: React.FC = () => {
    const handleExport = async () => {
        try {
            const response = await axios.post('http://localhost:61234/playback/api/export-participants-csv/', {}, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 200) {
                alert(`CSV file saved: ${response.data.message}`);
            } else {
                alert('Failed to export participants CSV');
            }
        } catch (error) {
            console.error('Error exporting participants CSV:', error);
            alert('An error occurred while exporting participants CSV');
        }
    };

    // Call handleExport when the component is mounted
    useEffect(() => {
        handleExport();
    }, []); // Empty dependency array ensures it runs once on mount

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            textAlign: 'center',
            backgroundColor: '#f9f9f9',
            color: '#333',
            fontFamily: 'Arial, sans-serif',
        }}>
            <h1 style={{ fontSize: '2.5rem', margin: '0.5rem' }}>Thank You!</h1>
            <p style={{ fontSize: '1.2rem', margin: '0.5rem' }}>You have completed the experiment.</p>
            <p style={{ fontSize: '1rem', margin: '0.5rem' }}>Please inform the researcher that you have finished.</p>
        </div>
    );
};

export default CompletionPage;
