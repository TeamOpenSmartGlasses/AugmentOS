// src/pages/AuthPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../utils/supabase';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header>
        <div className="mx-auto px-5 py-4 flex items-center justify-between bg-gray-100">
          <div className='select-none' onClick={() => navigate('/')}>
            <div className="flex items-end gap-0 cursor-pointer">
              <h1 className="font-cuprum font-bold text-5xl">.\</h1>
              <h1 className="font-light text-2xl pb-0.5 pl-1">ugment</h1>
              <h1 className="font-medium text-2xl pb-0.5">OS</h1>
            </div>
            <h2 className="text-sm text-gray-600 pb-1 ">Developer Portal</h2>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center bg-gray-100 px-4 py-12">
        <div className="w-full max-w-md p-8 justify-center items-center flex flex-col">
          <div className='select-none flex flex-col items-center'>
            <div className="flex items-end gap-0 cursor-pointer">
              <h1 className="font-cuprum font-bold text-5xl">.\</h1>
              <h1 className="font-light text-2xl pb-0.5 pl-1">ugment</h1>
              <h1 className="font-medium text-2xl pb-0.5">OS</h1>
            </div>
            <h2 className="text-sm text-gray-600 pb-1 ">Developer Portal</h2>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']}
            redirectTo={`${window.location.origin}/dashboard`}
            onlyThirdPartyProviders={true}
            magicLink={false}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} AugmentOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AuthPage;