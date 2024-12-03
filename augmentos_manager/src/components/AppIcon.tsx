import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { AppInfo } from '../AugmentOSStatusParser';

interface AppIconProps {
    app: AppInfo;
    isMainApp?: boolean;
    onClick?: () => void;
    style?: object;
    isDarkTheme?: boolean; // Add theme prop
}

const AppIcon: React.FC<AppIconProps> = ({ 
    app, 
    isMainApp = false, 
    onClick, 
    style,
    isDarkTheme = false 
}) => {
    const getAppImage = useMemo(
        () => (packageName: string) => {
            switch (packageName) {
                case 'Convoscope':
                    return require('../assets/app-icons/convo-rectangle.png');
                case 'ADHD Aid':
                    return require('../assets/app-icons/adhd-rectangle.png');
                case 'Translator':
                    return require('../assets/app-icons/translator-rectangle.png');
                case 'Placeholder':
                    return require('../assets/app-icons/ARGlassees-rectangle.png');
                default:
                    return require('../assets/app-icons/ARGlassees-rectangle.png');
            }
        },
        []
    );

    // For main apps, just return the ImageBackground
    if (isMainApp) {
        return (
            <ImageBackground
                source={getAppImage(app.package_name)}
                style={[styles.mainAppIcon, style]}
                imageStyle={styles.appIconRounded}
            />
        );
    }

    // For other apps
    return (
        <View style={[styles.appWrapper]} onTouchEnd={onClick}>
            <View style={[
                styles.appIconWrapper, 
                isDarkTheme ? styles.appIconWrapperDark : styles.appIconWrapperLight,
                style
            ]}>
                <ImageBackground
                    source={getAppImage(app.package_name)}
                    style={styles.appIcon}
                    imageStyle={styles.appIconRounded}
                />
            </View>
            <Text style={[
                styles.appName,
                isDarkTheme ? styles.appNameDark : styles.appNameLight
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
        borderColor: '#E5E5EA', // Light theme border color
    },
    appIconWrapperDark: {
        borderColor: '#333333', // Dark theme border color
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
        color: '#000000', // Light theme text color
    },
    appNameDark: {
        color: '#FFFFFF', // Dark theme text color
    },
});

export default AppIcon;