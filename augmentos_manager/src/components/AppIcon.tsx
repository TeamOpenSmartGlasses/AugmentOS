import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { AppInfo } from '../AugmentOSStatusParser';

interface AppIconProps {
    app: AppInfo;
    isMainApp?: boolean;
    onClick?: () => void;
    style?: object;
    isDarkTheme?: boolean;
}

const AppIcon: React.FC<AppIconProps> = ({
    app,
    isMainApp = false,
    onClick,
    style,
    isDarkTheme = false,
}) => {
    const getAppImage = useMemo(
        () => (packageName: string) => {
            switch (packageName) {
                case 'com.example.convoscope':
                    return require('../assets/app-icons/convoscope.png');
                case 'com.example.adhdaid':
                    return require('../assets/app-icons/ADHD-aid.png');
                case 'com.translator.app':
                    return require('../assets/app-icons/translation.png');
                case 'com.example.placeholder':
                    return require('../assets/app-icons/screen-mirror.png');
                case 'com.example.screenmirror':
                    return require('../assets/app-icons/screen-mirror.png');
                case 'com.example.livecaptions':
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

    if (isMainApp) {
        return (
            <ImageBackground
                source={getAppImage(app.package_name)}
                style={[styles.mainAppIcon, style]}
                imageStyle={styles.appIconRounded}
            />
        );
    }

    return (
        <View style={[styles.appWrapper]} onTouchEnd={onClick}>
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
            <Text style={[
                styles.appName,
                isDarkTheme ? styles.appNameDark : styles.appNameLight,
            ]} numberOfLines={1}>
                {app.name}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    appWrapper: {
        alignItems: 'center',
        width: 65,
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
});

export default AppIcon;
