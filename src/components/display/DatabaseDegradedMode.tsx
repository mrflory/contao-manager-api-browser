import { Box, HStack, VStack, Text, Button, Icon } from '@chakra-ui/react';
import { LuServerOff, LuRefreshCw } from 'react-icons/lu';

interface DatabaseDegradedModeProps {
    onRetry?: () => void;
    isRetrying?: boolean;
}

/**
 * DatabaseDegradedMode Component
 * Displays a full-page error state when the database is unavailable
 */
export const DatabaseDegradedMode = ({ onRetry, isRetrying = false }: DatabaseDegradedModeProps) => {
    return (
        <Box
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="bg"
            zIndex="9999"
            display="flex"
            alignItems="center"
            justifyContent="center"
        >
            <VStack gap={6} maxW="600px" px={6} textAlign="center">
                <Icon fontSize="6xl" color="red.500">
                    <LuServerOff />
                </Icon>

                <VStack gap={2}>
                    <Text fontSize="2xl" fontWeight="bold">
                        Service Temporarily Unavailable
                    </Text>
                    <Text fontSize="md" color="fg.muted">
                        We're experiencing technical difficulties connecting to our database.
                        This is usually temporary and should resolve shortly.
                    </Text>
                </VStack>

                <Box
                    bg="bg.muted"
                    borderRadius="md"
                    p={4}
                    w="100%"
                >
                    <VStack gap={2} fontSize="sm" color="fg.muted">
                        <Text fontWeight="medium">What's happening?</Text>
                        <Text>
                            Our database service is currently unavailable. This may be due to:
                        </Text>
                        <VStack gap={1} alignItems="flex-start" w="100%">
                            <Text>• Scheduled maintenance</Text>
                            <Text>• Temporary connection issues</Text>
                            <Text>• Service provider outage</Text>
                        </VStack>
                    </VStack>
                </Box>

                {onRetry && (
                    <Button
                        onClick={onRetry}
                        loading={isRetrying}
                        colorPalette="blue"
                        size="lg"
                    >
                        <HStack>
                            <Icon>
                                <LuRefreshCw />
                            </Icon>
                            <Text>{isRetrying ? 'Retrying...' : 'Try Again'}</Text>
                        </HStack>
                    </Button>
                )}

                <Text fontSize="sm" color="fg.muted">
                    If this problem persists, please contact support or check our status page.
                </Text>
            </VStack>
        </Box>
    );
};
