import { useTheme } from 'next-themes';

/**
 * Custom hook to replace Chakra UI v2's useColorModeValue
 * Returns different values based on the current theme (light/dark)
 */
export function useColorModeValue<T>(lightValue: T, darkValue: T): T {
  const { theme, systemTheme } = useTheme();
  
  // Determine the current theme (handle system theme)
  const currentTheme = theme === 'system' ? systemTheme : theme;
  
  return currentTheme === 'dark' ? darkValue : lightValue;
}

/**
 * Custom hook to replace Chakra UI v2's useColorMode
 * Provides theme state and toggle functionality
 */
export function useColorMode() {
  const { theme, setTheme, systemTheme } = useTheme();
  
  const currentTheme = theme === 'system' ? systemTheme : theme;
  
  const toggleColorMode = () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };
  
  return {
    colorMode: currentTheme || 'light',
    toggleColorMode,
    setColorMode: setTheme,
  };
}