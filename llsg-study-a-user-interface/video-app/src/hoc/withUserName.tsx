// @ts-ignore
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const withUserName = (WrappedComponent: React.FC<any>) => {
  return (props: any) => {
    const [userName, setUserName] = useState<string | null>(null);

    useEffect(() => {
      const fetchUserName = async () => {
        try {
          const response = await axios.get('http://localhost:8000/playback/api/get-current-user-id/');
          setUserName(response.data.userID);
        } catch (error) {
          console.error('Error fetching user name:', error);
        }
      };

      fetchUserName();
    }, []);

    return <WrappedComponent {...props} userName={userName} />;
  };
};

export default withUserName;