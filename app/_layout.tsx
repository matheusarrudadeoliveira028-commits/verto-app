import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

// FIX: Importação do hook de cores (verifique se o nome do arquivo é use-color-scheme.ts ou useColorScheme.ts na sua pasta hooks)
import { useColorScheme } from '@/hooks/use-color-scheme';

// Impede a tela de splash de sumir automaticamente antes do app estar pronto
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // --- FIX: Removido o carregamento da fonte SpaceMono que estava faltando ---
  // Se você quiser usar fontes personalizadas no futuro, adicione o arquivo em assets/fonts
  // e descomente o código abaixo:
  /*
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  */

  useEffect(() => {
    // Como removemos o carregamento da fonte, podemos esconder a splash screen imediatamente
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}