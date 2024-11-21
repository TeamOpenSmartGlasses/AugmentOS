import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ParticipantIDPage from './pages/ParticipantIDPage';
import PretestPage from './pages/PretestPage';
import VideoPage from './pages/VideoPage';
import TLX from './pages/TLX';
import SpeedQualitativeQuestions from "./pages/SpeedQualitativeQuestions";
import NumberQualitativeQuestions from "./pages/NumberQualitativeQuestions";
import SpecialVideoPage from "./pages/SpecialVideoPage";
import QualitativeOverallPage from "./pages/QualitativeOverallPage";
import CompletionPage from "./pages/CompletionPage";
import ContentUnderstandingPage from './pages/ContentUnderstandingPage';

const App: React.FC = () => {
    localStorage.setItem('video_count', '0');
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ParticipantIDPage />} />
        <Route path="/pretest/" element={<PretestPage />} />
        <Route path="/video/" element={<VideoPage />} />
        <Route path="/tlx/" element={<TLX />} />
        <Route path="/content_understanding/" element={<ContentUnderstandingPage />} />
        <Route path="/speed_qualitative/" element={<SpeedQualitativeQuestions />} />
        <Route path="/number_qualitative/" element={<NumberQualitativeQuestions />} />
        <Route path="/special_video/" element={<SpecialVideoPage />} />
        <Route path="/qualitative_overall/" element={<QualitativeOverallPage />} />
        <Route path="/completion/" element={<CompletionPage />} />
      </Routes>
    </Router>
  );
};

export default App;
