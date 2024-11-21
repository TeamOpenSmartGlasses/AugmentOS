import React from 'react';

const CompletionPage: React.FC = () => {
    const handleExport = async () => {
        try {
          const response = await fetch('/export-participants-csv/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            alert(`CSV file saved: ${data.message}`);
          } else {
            alert('Failed to export participants CSV');
          }
        } catch (error) {
          console.error('Error exporting participants CSV:', error);
          alert('An error occurred while exporting participants CSV');
        }
    };

  return (
    <div>
      <h1>Thank You!</h1>
      <p>You have completed the experiment.</p>
      <p>Please inform the researcher that you have finished.</p>
    </div>
  );
};

export default CompletionPage;
