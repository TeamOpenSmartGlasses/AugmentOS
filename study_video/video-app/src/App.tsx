import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ParticipantIDPage from './pages/ParticipantIDPage';
import PretestPage from './pages/PretestPage';
import VideoPage from './pages/VideoPage';
import PosttestPage from './pages/PosttestPage';
import CompletionPage from './pages/CompletionPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ParticipantIDPage />} />
        <Route path="/pretest" element={<PretestPage />} />
        <Route path="/video/:id" element={<VideoPage />} />
        <Route path="/posttest/:id" element={<PosttestPage />} />
        <Route path="/completion" element={<CompletionPage />} />
      </Routes>
    </Router>
  );
};

export default App;
