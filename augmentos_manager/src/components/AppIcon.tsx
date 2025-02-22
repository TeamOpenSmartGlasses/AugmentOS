// AppIcon.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { AppInfo } from '../AugmentOSStatusParser';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from './types';
// import BluetoothService from '../BluetoothService';

interface AppIconProps {
    app: AppInfo;
    isForegroundApp?: boolean;
    onClick?: () => void;
    style?: object;
    isDarkTheme?: boolean;
}

const AppIcon: React.FC<AppIconProps> = ({
    app,
    isForegroundApp = false,
    onClick,
    style,
    isDarkTheme = false,
}) => {
  const navigation = useNavigation<NavigationProps>();

    const getAppImage = useMemo(
        () => (packageName: string) => {
            switch (packageName) {
                case 'com.mentra.merge':
                    return require('../assets/app-icons/mentra-merge.png');
                case 'com.mentra.link':
                    return require('../assets/app-icons/mentra-link.png');
                case 'com.mentra.adhdaid':
                    return require('../assets/app-icons/ADHD-aid.png');
                case 'com.augmentos.livetranslation':
                    return require('../assets/app-icons/translation.png');
                case 'com.example.placeholder':
                case 'com.augmentos.screenmirror':
                    return require('../assets/app-icons/screen-mirror.png');
                case 'com.augmentos.live-captions':
                    return require('../assets/app-icons/captions.png');
                case 'com.augmentos.miraai':
                    return require('../assets/app-icons/mira-ai.png');
                case 'com.google.android.apps.maps':
                case 'com.augmentos.navigation':
                    return require('../assets/app-icons/navigation.png');
                case 'com.augmentos.notify':
                    return require('../assets/app-icons/phone-notifications.png');
                default:
                    return require('../assets/app-icons/navigation.png');
            }
        },
        []
    );

    const openAppSettings = async () => {
        navigation.navigate('AppSettings', {
            packageName: app.packageName,
            appName: app.name
        });
    }

    return (
        <TouchableOpacity
            onPress={onClick}
            onLongPress={openAppSettings}
            activeOpacity={0.7}
            style={[styles.appWrapper, style]}
            accessibilityLabel={`Launch ${app.name}`}
            accessibilityRole="button"
        >
            <LinearGradient
                colors={isForegroundApp ? ['#ADE7FF', '#FFB2F9', '#FFE396'] : ['transparent', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.linearGradient}
            >
                <View
                    style={[
                        styles.appIconWrapper,
                        isDarkTheme ? styles.appIconWrapperDark : styles.appIconWrapperLight,
                    ]}
                >
                    <ImageBackground
                        source={getAppImage(app.packageName)}
                        style={styles.appIcon}
                        imageStyle={styles.appIconRounded}
                    />
                </View>
            </LinearGradient>

            {isForegroundApp && (
                <View style={styles.squareBadge}>
                    <FontAwesome name="star" size={12} color="#FFFFFF" />
                </View>
            )}

            <Text
                style={[
                    styles.appName,
                    isDarkTheme ? styles.appNameDark : styles.appNameLight,
                ]}
                numberOfLines={2}
            >
                {app.name}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    linearGradient: {
        borderRadius: 23,
        padding: 2,
    },
    appWrapper: {
        alignItems: 'center',
        width: 70,
        height: 100,
        borderColor: '#E5E5EA',
    },
    appIconWrapper: {
        width: 65,
        height: 65,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 23,
        overflow: 'hidden',
        borderWidth: 1,
    },
    appIconWrapperLight: {
        borderColor: '#E5E5EA',
    },
    appIconWrapperDark: {
        borderColor: '#333333',
    },
    appIcon: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    appIconRounded: {
        borderRadius: 15,
    },
    appName: {
        marginTop: 5,
        fontSize: 11,
        fontWeight: '600',
        fontFamily: 'Montserrat-Bold',
        lineHeight: 12,
        textAlign: 'center',
    },
    appNameLight: {
        color: '#000000',
    },
    appNameDark: {
        color: '#FFFFFF',
    },
    squareBadge: {
        position: 'absolute',
        top: -8,
        right: 3,
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: '#FF438B',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
});

export default React.memo(AppIcon);
