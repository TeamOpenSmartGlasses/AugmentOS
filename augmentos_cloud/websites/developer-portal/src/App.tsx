// App.tsx
import React from 'react';
import { BrowserRouter, Route, Routes } from "react-router-dom";
// import { ThemeProvider } from "@/components/ui/theme-provider";

// Pages
import LandingPage from './pages/LandingPage';
import DashboardHome from './pages/DashboardHome';

// import SignIn from './pages/SignIn';
// import SignUp from './pages/SignUp';
import TPAList from './pages/TPAList';
import CreateTPA from './pages/CreateTPA';
import EditTPA from './pages/EditTPA';
import NotFound from './pages/NotFound';

const App: React.FC = () => {
  return (
    // <DashboardHome />
    // <ThemeProvider defaultTheme="light" storageKey="augmentos-theme">
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        {/* <Route path="/signin" element={<SignIn />} /> */}
        {/* <Route path="/signup" element={<SignUp />} /> */}

        {/* Dashboard Routes - No auth for now */}
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/tpas" element={<TPAList />} />
        <Route path="/tpas/create" element={<CreateTPA />} />
        <Route path="/tpas/:packageName/edit" element={<EditTPA />} />

        {/* Catch-all Not Found route */}
        <Route path="*" element={<NotFound />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
    // </ThemeProvider>
  );
};

export default App;