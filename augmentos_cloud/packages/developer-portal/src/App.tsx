// App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { ThemeProvider } from "@/components/ui/theme-provider";

// Pages
import LandingPage from './pages/LandingPage';
// import SignIn from './pages/SignIn';
// import SignUp from './pages/SignUp';
import DashboardHome from './pages/DashboardHome';
// import TPAList from './pages/TPAList';
// import CreateTPA from './pages/CreateTPA';
// import EditTPA from './pages/EditTPA';
// import NotFound from './pages/NotFound';

// Auth provider (replace with your actual auth provider/context)
// import { AuthProvider, useAuth } from './contexts/AuthContext';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // const { isAuthenticated } = useAuth();
  
  // if (!isAuthenticated) {
  //   return <Navigate to="/signin" replace />;
  // }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardHome />
              </ProtectedRoute>
            } />
            <Route path="/tpas" element={
              <ProtectedRoute>
                <TPAList />
              </ProtectedRoute>
            } />
            <Route path="/tpas/create" element={
              <ProtectedRoute>
                <CreateTPA />
              </ProtectedRoute>
            } />
            <Route path="/tpas/:packageName/edit" element={
              <ProtectedRoute>
                <EditTPA />
              </ProtectedRoute>
            } />
            
            {/* Catch-all Not Found route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
  );
};

export default App;