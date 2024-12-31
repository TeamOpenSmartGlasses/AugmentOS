import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    TouchableOpacity,
    Platform,
    ScrollView,
    Animated,
    Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useStatus } from '../AugmentOSStatusProvider';
import { BluetoothService } from '../BluetoothService';
import { loadSetting, saveSetting } from '../augmentos_core_comms/SettingsHelper';
import { SETTINGS_KEYS } from '../consts';
import NavigationBar from '../components/NavigationBar';
import { getGlassesImage } from '../logic/getGlassesImage';

interface SelectGlassesScreenProps {
    isDarkTheme: boolean;
    toggleTheme: () => void;
    navigation: any;
}

const SelectGlassesScreen: React.FC<SelectGlassesScreenProps> = ({
    isDarkTheme,
    toggleTheme,
    navigation,
}) => {
    const [isDoNotDisturbEnabled, setDoNotDisturbEnabled] = React.useState(false);
    const [isBrightnessAutoEnabled, setBrightnessAutoEnabled] = React.useState(false);
    const { status } = useStatus();
    const [isUsingAudioWearable, setIsUsingAudioWearable] = React.useState(
        status.default_wearable == 'Audio Wearable',
    );

    // Example list of glasses to display:
    const glassesOptions = [
        { modelName: 'Vuzix Z100', key: 'vuzix-z100' },
        { modelName: 'Mentra Mach1', key: 'mentra_mach1' },
        // { modelName: 'Inmo Air', key: 'inmo_air' },
        // { modelName: 'TCL Rayneo X2', key: 'tcl_rayneo_x_two' },
        // { modelName: 'Vuzix Shield', key: 'Vuzix_shield' },
        { modelName: 'Even Realities G1', key: 'evenrealities_g1' },
        { modelName: 'Audio Wearable', key: 'Audio Wearable' },
    ];

    React.useEffect(() => {
        const loadInitialSettings = async () => {
            // Any async calls to load settings can happen here
        };
        loadInitialSettings();
    }, []);

    const switchColors = {
        trackColor: {
            false: isDarkTheme ? '#666666' : '#D1D1D6',
            true: '#2196F3',
        },
        thumbColor:
            Platform.OS === 'ios' ? undefined : isDarkTheme ? '#FFFFFF' : '#FFFFFF',
        ios_backgroundColor: isDarkTheme ? '#666666' : '#D1D1D6',
    };

    const toggleVirtualWearable = async () => {
        let isUsingAudio = status.default_wearable == 'Audio Wearable';
        BluetoothService.getInstance().sendToggleVirtualWearable(!isUsingAudio);
        setIsUsingAudioWearable(!isUsingAudio);
    };

    const sendDisconnectWearable = async () => {
        throw new Error('Function not implemented.');
    };

    const forgetPuck = async () => {
        await BluetoothService.getInstance().disconnectFromDevice();
        await saveSetting(SETTINGS_KEYS.PREVIOUSLY_BONDED_PUCK, null);
    };

    const forgetGlasses = async () => {
        await BluetoothService.getInstance().sendForgetSmartGlasses();
    };

    // Theme colors
    const theme = {
        backgroundColor: isDarkTheme ? '#1c1c1c' : '#f9f9f9',
        headerBg: isDarkTheme ? '#333333' : '#fff',
        textColor: isDarkTheme ? '#FFFFFF' : '#333333',
        subTextColor: isDarkTheme ? '#999999' : '#666666',
        cardBg: isDarkTheme ? '#333333' : '#fff',
        borderColor: isDarkTheme ? '#444444' : '#e0e0e0',
        searchBg: isDarkTheme ? '#2c2c2c' : '#f5f5f5',
        categoryChipBg: isDarkTheme ? '#444444' : '#e9e9e9',
        categoryChipText: isDarkTheme ? '#FFFFFF' : '#555555',
        selectedChipBg: isDarkTheme ? '#666666' : '#333333',
        selectedChipText: isDarkTheme ? '#FFFFFF' : '#FFFFFF',
    };

    return (
        <View
            style={[
                styles.container,
                isDarkTheme ? styles.darkBackground : styles.lightBackground,
            ]}
        >

            <ScrollView style={styles.scrollViewContainer}>
                {/** RENDER EACH GLASSES OPTION */}
                {glassesOptions.map((glasses) => (
                    <TouchableOpacity
                        key={glasses.key}
                        style={styles.settingItem}
                        onPress={() => {
                            navigation.navigate('GlassesPairingGuideScreen', {
                                glassesModelName: glasses.modelName,
                              });
                        }}
                    >
                        <Image
                            source={getGlassesImage(glasses.modelName)}
                            style={styles.glassesImage}
                        />
                        <View style={styles.settingTextContainer}>
                            <Text
                                style={[
                                    styles.label,
                                    isDarkTheme ? styles.lightText : styles.darkText,
                                ]}
                            >
                                {glasses.modelName}
                            </Text>
                        </View>
                        <Icon
                            name="angle-right"
                            size={20}
                            color={
                                isDarkTheme ? styles.lightIcon.color : styles.darkIcon.color
                            }
                        />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    scrollViewContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal:20,
    },
    titleContainer: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginHorizontal: -20,
        marginTop: -20,
        marginBottom: 10,
    },
    titleContainerDark: {
        backgroundColor: '#333333',
    },
    titleContainerLight: {
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Montserrat-Bold',
        textAlign: 'left',
        color: '#FFFFFF',
        marginBottom: 5,
    },
    darkBackground: {
        backgroundColor: '#1c1c1c',
    },
    lightBackground: {
        backgroundColor: '#f0f0f0',
    },
    darkText: {
        color: 'black',
    },
    lightText: {
        color: 'white',
    },
    darkSubtext: {
        color: '#666666',
    },
    lightSubtext: {
        color: '#999999',
    },
    darkIcon: {
        color: '#333333',
    },
    lightIcon: {
        color: '#666666',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButtonText: {
        marginLeft: 10,
        fontSize: 18,
        fontWeight: 'bold',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        borderBottomColor: '#333',
        borderBottomWidth: 1,
    },
    settingTextContainer: {
        flex: 1,
        paddingHorizontal: 10,
    },
    label: {
        fontSize: 16,
        flexWrap: 'wrap',
    },
    value: {
        fontSize: 12,
        marginTop: 5,
        flexWrap: 'wrap',
    },
    headerContainer: {
        backgroundColor: '#fff',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    header: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
    },
    glassesImage: {
        width: 50,
        height: 30,
        resizeMode: 'contain',
        marginRight: 10,
    },
});

export default SelectGlassesScreen;
