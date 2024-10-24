import React from 'react';
import withUserName from '../hoc/withUserName';

const CompletionPage: React.FC = () => {
  return (
    <div>
      <h1>Thank You!</h1>
      <p>You have completed the experiment.</p>
    </div>
  );
};

export default withUserName(CompletionPage);
