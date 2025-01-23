import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../supabaseClient'; // Replace with your Supabase setup
import { NavigationProps } from '../components/types';

const VerifyEmailScreen = () => {
    const route = useRoute();
    const params = route.params as { token: string, email: string };
    const navigation = useNavigation<NavigationProps>();

    useEffect(() => {
        const verifyEmail = async () => {
            if (params?.token && params?.email) {  // Add email check
                const { data, error } = await supabase.auth.verifyOtp({
                    token: params.token,
                    type: 'email',
                    email: params.email,  // Add email parameter
                });

                if (error) {
                    console.error('Verification failed:', error.message);
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'SplashScreen' }],
                    });
                } else {
                    console.log('Email verified successfully:', data);
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                    });
                }
            }
        };

        verifyEmail();
    }, [params]);

    if (!params?.token) {
        return (
            <View>
                <Text>Invalid verification link.</Text>
            </View>
        );
    }

    return (
        <View>
            <Text>Verifying your email...</Text>
            <ActivityIndicator size="large" />
        </View>
    );
};

export default VerifyEmailScreen;
