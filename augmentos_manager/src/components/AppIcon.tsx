import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { AppInfo } from '../AugmentOSStatusParser';

interface AppIconProps {
    app: AppInfo;
    isMainApp?: boolean;
    onClick?: () => void;
    style?: object;
}

const AppIcon: React.FC<AppIconProps> = ({ app, isMainApp = false, onClick, style }) => {
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

    return (
        <View>
            <View style={[styles.appWrapper, style]} onTouchEnd={onClick}>
                <View style={isMainApp ? styles.mainAppIconWrapper : styles.appIconWrapper}>
                    <ImageBackground
                        source={getAppImage(app.package_name)}
                        style={isMainApp ? styles.mainAppIcon : styles.appIcon}
                        imageStyle={styles.appIconRounded} // Add rounded corners
                    />
                </View>
            </View>
            <Text style={styles.appName} numberOfLines={1}>
                {app.name}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    appWrapper: {
        alignItems: 'center',
        width: 75,
        marginLeft: 10,
    },
    appIconWrapper: {
        width: 65,
        height: 65,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 15, // Apply border radius to the wrapper
        overflow: 'hidden', // Ensure the child respects the border radius
    },
    mainAppIconWrapper: {
        width: 75,
        height: 75,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 15, // Apply border radius to the wrapper
        overflow: 'hidden', // Ensure the child respects the border radius
    },
    appIcon: {
        width: '100%',
        height: '100%',
    },
    appIconRounded: {
        borderRadius: 15, // Round the corners of the ImageBackground
    },
    appName: {
        marginTop: 15,
        marginLeft: 7,
        fontSize: 11,
        fontWeight: '600',
        fontFamily: 'Montserrat-Bold',
        lineHeight: 16,
        textAlign: 'center',
    },
});

export default AppIcon;
