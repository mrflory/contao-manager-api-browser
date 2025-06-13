import React from 'react';
import {
  Box,
  Flex,
  Heading,
  IconButton,
} from '@chakra-ui/react';
import { Sun, Moon } from 'lucide-react';
import { useColorMode, useColorModeValue } from '../hooks/useColorModeValue';

const Header: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue('brand.500', 'brand.700');
  const hoverBg = useColorModeValue('brand.600', 'brand.800');
  const color = 'white';

  return (
    <Box bg={bg} color={color} px={6} py={4} boxShadow="md">
      <Flex align="center" justify="space-between">
        <Heading size="lg" fontWeight="bold">
          Contao Manager API Browser
        </Heading>
        <IconButton
          aria-label="Toggle color mode"
          onClick={toggleColorMode}
          variant="ghost"
          color={color}
          _hover={{
            bg: hoverBg,
          }}
        >
          {colorMode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </IconButton>
      </Flex>
    </Box>
  );
};

export default Header;