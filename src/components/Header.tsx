import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading
} from '@chakra-ui/react';
import { ColorModeButton, useColorModeValue } from './ui/color-mode'

const Header: React.FC = () => {
  const navigate = useNavigate();
  const bg = useColorModeValue('brand.500', 'brand.700');
  const color = 'white';

  return (
    <Box bg={bg} color={color} px={6} py={4} boxShadow="md">
      <Flex align="center" justify="space-between">
        <Heading 
          size="lg" 
          fontWeight="bold"
          cursor="pointer"
          onClick={() => navigate('/')}
          _hover={{ textDecoration: 'underline' }}
        >
          Contao Manager API Browser
        </Heading>
        <ColorModeButton />
      </Flex>
    </Box>
  );
};

export default Header;