import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { AppInfo } from '../AugmentOSStatusParser';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

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
    const getAppImage = useMemo(
        () => (packageName: string) => {
            switch (packageName) {
                case 'com.mentra.merge':
                    return require('../assets/app-icons/mentra-merge.png');
                case 'com.mentra.link':
                    return require('../assets/app-icons/mentra-link.png');
                case 'com.mentra.adhdaid':
                    return require('../assets/app-icons/ADHD-aid.png');
                case 'com.mentra.livetranslation':
                    return require('../assets/app-icons/translation.png');
                case 'com.example.placeholder':
                    return require('../assets/app-icons/screen-mirror.png');
                case 'com.example.screenmirror':
                    return require('../assets/app-icons/screen-mirror.png');
                case 'com.mentra.livecaptions':
                    return require('../assets/app-icons/captions.png');
                case 'com.example.miraai':
                    return require('../assets/app-icons/mira-ai.png');
                case 'com.google.android.apps.maps':
                    return require('../assets/app-icons/navigation.png');
                default:
                    return require('../assets/app-icons/navigation.png');
            }
        },
        []
    );

    return (
        <View style={[styles.appWrapper]} onTouchEnd={onClick}>
            <LinearGradient colors={isForegroundApp ? ['#ADE7FF', '#FFB2F9', '#FFE396'] : ['transparent', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.linearGradient}
            >
                <View style={[
                    styles.appIconWrapper,
                    isDarkTheme ? styles.appIconWrapperDark : styles.appIconWrapperLight,
                    style,
                ]}>
                    <ImageBackground
                        source={getAppImage(app.package_name)}
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

            <Text style={[
                styles.appName,
                isDarkTheme ? styles.appNameDark : styles.appNameLight,
            ]} numberOfLines={2}>
                {app.name}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    linearGradient: {
        borderRadius: 23,
        padding: 2,
    },
    appWrapper: {
        alignItems: 'center',
        height: '100%',
        width: '100%',
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
    mainAppIcon: {
        width: '100%',
        height: '100%',
    },
    appIconRounded: {
        borderRadius: 15,
    },
    appName: {
        marginTop: 5,
        fontSize: 11,
        fontWeight: '600',
        fontFamily: 'Montserrat-Bold',
        lineHeight: 16,
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
        right: -6,
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: '#FF438B',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
});

export default AppIcon;
