import React from 'react';
import { useLocation } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../utils/supabase';
import Header from '../components/Header';

const LoginPage: React.FC = () => {
  // const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect path from location state or default to home
  const from = (location.state)?.from?.pathname || '/';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
        {/* <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow flex flex-col items-center"> */}
        <div className="max-w-md mx-auto flex flex-col items-center">

          {/* Logo and Site Name */}
          <div className="flex items-end select-none">
            <h1 className="font-cuprum font-bold text-5xl">.\</h1>
            <h1 className="font-light text-2xl pb-0.5 pl-1 text-gray-800">ugment</h1>
            <h1 className="font-bold text-2xl pb-0.5">OS</h1>
          </div>
          <span className="ml-2 font-medium text-lg text-gray-800">App Store</span>

          <div className="mb-0">
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={['google']}
              redirectTo={`${window.location.origin}${from}`}
              onlyThirdPartyProviders={true}
            />
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;