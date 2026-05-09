import { Redirect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/shared/config/colors';

export default function Index() {
  const { user, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (user?.role === 'admin') {
    return <Redirect href="/(admin)" />
  }

  return <Redirect href="/(tabs)" />;
}
