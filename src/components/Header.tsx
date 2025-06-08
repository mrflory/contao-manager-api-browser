import React from 'react';
import {
  Box,
  Flex,
  Heading,
  IconButton,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';

const Header: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue('brand.500', 'brand.700');
  const color = 'white';

  return (
    <Box bg={bg} color={color} px={6} py={4} boxShadow="md">
      <Flex align="center" justify="space-between">
        <Heading size="lg" fontWeight="bold">
          Contao Manager API Browser
        </Heading>
        <IconButton
          aria-label="Toggle color mode"
          icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
          onClick={toggleColorMode}
          variant="ghost"
          color={color}
          _hover={{
            bg: useColorModeValue('brand.600', 'brand.800'),
          }}
        />
      </Flex>
    </Box>
  );
};

export default Header;