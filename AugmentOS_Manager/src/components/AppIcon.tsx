import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useStatus } from '../AugmentOSStatusProvider';
import { AppInfo } from '../AugmentOSStatusParser';

interface AppIconProps {
    app: AppInfo;
    isMainApp?: boolean;
    onClick?: () => void;
}

const AppIcon: React.FC<AppIconProps> = ({ app, isMainApp = false, onClick }) => {
    // Memoized function to get the app image
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
        <View style={styles.appWrapper} onTouchEnd={onClick}>
            <View style={[isMainApp ? styles.mainAppIconWrapper : styles.appIconWrapper, {}]}>
                <ImageBackground
                    source={getAppImage(app.package_name)}
                    style={isMainApp ? styles.mainAppIcon : styles.appIcon}
                    imageStyle={isMainApp ? styles.mainAppIconImage : undefined}
                >
                    {isMainApp && (
                        <>
                            <LinearGradient
                                colors={['#ADE7FF', '#FFB2F9', '#FFE396']}
                                style={styles.overlayRing}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.squareBadge}>
                                <FontAwesome name="star" size={12} color="#FFFFFF" />
                            </View>
                        </>
                    )}
                </ImageBackground>
            </View>
            <Text style={[styles.appName, {  }]} numberOfLines={1}>
                {app.name}
            </Text>
        </View>
    );
};


const styles = StyleSheet.create({
    appsContainer: {
        marginBottom: 30,
        marginTop: 30,
        borderRadius: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        fontFamily: 'Montserrat-Bold',
        lineHeight: 25,
        letterSpacing: 0.38,
        marginBottom: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    gradientBackground: {
        width: '100%',
        height: 150,
        paddingVertical: 6,
        paddingHorizontal: 15,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appIconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
    },
    appWrapper: {
        alignItems: 'center',
        width: 75,
        marginLeft: 10,
    },
    mainAppIconWrapper: {
        width: 75,
        height: 75,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderWidth: 0.5,
        borderColor: '#000',
        borderRadius: 15,
    },
    mainAppIcon: {
        width: '100%',
        height: '100%',
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    mainAppIconImage: {
        borderRadius: 15,
    },
    overlayRing: {
        position: 'absolute',
        width: '120%',
        height: '120%',
        borderRadius: 15,
        zIndex: -1,
    },
    squareBadge: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: '#FF438B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    appIconWrapper: {
        width: 70,
        height: 70,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 10,
        marginTop: 10,
    },
    appIcon: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    appName: {
        marginTop: 15,
        fontSize: 11,
        fontWeight: '600',
        fontFamily: 'Montserrat-Bold',
        lineHeight: 16,
        textAlign: 'center',
    },
});

export default AppIcon;
