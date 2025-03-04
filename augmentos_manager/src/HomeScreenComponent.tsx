import React from 'react';
import { View, Text } from 'react-native';
import { useStatus } from './providers/AugmentOSStatusProvider';

const HomeScreenComponent = () => {
  const { status } = useStatus();

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Puck Status</Text>
      <Text>Puck Connected: {status.core_info.puck_connected ? 'Yes' : 'No'}</Text>
      <Text>Puck Battery Life: {status.core_info.puck_battery_life ?? 'N/A'}%</Text>

      <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Connected Glasses</Text>
      {status.glasses_info ? (
        <>
          <Text>Model: {status.glasses_info?.model_name}</Text>
          <Text>Battery Life: {status.glasses_info?.battery_life}%</Text>
          <Text>{JSON.stringify(status)}</Text>
        </>
      ) : (
        <Text>No Glasses Connected</Text>
      )}

      <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Installed Apps</Text>
      {status.apps.map((app, index) => (
        <View key={index}>
          <Text>Name: {app.name}</Text>
          <Text>Description: {app.description}</Text>
          <Text>Running: {app.is_running ? 'Yes' : 'No'}</Text>
          <Text>Foreground: {app.is_foreground ? 'Yes' : 'No'}</Text>
        </View>
      ))}
    </View>
  );
};

export default HomeScreenComponent;
