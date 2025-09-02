import React, { useEffect, useState } from 'react';
import {
  VStack,
  HStack,
  Heading,
  Box,
} from '@chakra-ui/react';
import { LuPackage as Package } from 'react-icons/lu';
import { useApiCall } from '../../hooks/useApiCall';
import { ExpertApiService } from '../../services/apiCallService';
import { formatSortedPackages } from '../../utils/formatters';
import { LoadingState } from '../display/LoadingState';

export const PackagesTab: React.FC = () => {
  const [installedPackagesData, setInstalledPackagesData] = useState<Record<string, unknown> | null>(null);
  const [allPackagesData, setAllPackagesData] = useState<Record<string, unknown> | null>(null);

  // API calls for fetching data
  const loadInstalledPackages = useApiCall(
    async () => {
      const [allPackages, rootPackage] = await Promise.all([
        ExpertApiService.getInstalledPackages(),
        ExpertApiService.getRootPackageDetails()
      ]);
      return { allPackages, rootPackage };
    },
    {
      onSuccess: (data) => {
        const result = data as { allPackages: Record<string, unknown>; rootPackage: Record<string, unknown> };
        const filteredPackages = filterInstalledPackages(result.allPackages, result.rootPackage);
        setInstalledPackagesData(filteredPackages);
      },
      showErrorToast: true,
    }
  );

  const loadAllPackages = useApiCall(
    () => ExpertApiService.getInstalledPackages(),
    {
      onSuccess: (data) => {
        setAllPackagesData(data as Record<string, unknown>);
      },
      showErrorToast: true,
    }
  );

  // Helper function to filter packages based on root package requirements
  const filterInstalledPackages = (allPackages: Record<string, unknown>, rootPackage: Record<string, unknown>) => {
    if (!rootPackage || !rootPackage.require || !allPackages) {
      return {};
    }

    const requiredPackageNames = Object.keys(rootPackage.require as Record<string, unknown>);
    const installedPackages: Record<string, unknown> = {};

    requiredPackageNames.forEach(packageName => {
      if (allPackages[packageName]) {
        installedPackages[packageName] = allPackages[packageName];
      }
    });

    return installedPackages;
  };

  // Load data on component mount (now only happens when tab is active due to lazyMount)
  useEffect(() => {
    loadInstalledPackages.execute();
    loadAllPackages.execute();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <VStack gap={8} align="stretch">
      <Heading size="lg">Package Management</Heading>
      
      {/* Section 1: Installed Packages */}
      <Box>
        <HStack gap={2} mb={4}>
          <Package size={20} />
          <Heading size="md" color="purple.500">Installed Packages</Heading>
        </HStack>
        
        {loadInstalledPackages.state.loading ? (
          <LoadingState message="Loading installed packages..." />
        ) : installedPackagesData ? (
          formatSortedPackages(installedPackagesData, { 
            priorityPrefix: 'contao',
            sectionTitle: 'installed package'
          })
        ) : (
          <Box p={4} borderWidth="1px" borderRadius="md">
            No installed packages data available.
          </Box>
        )}
      </Box>

      {/* Section 2: All Local Packages */}
      <Box>
        <HStack gap={2} mb={4}>
          <Package size={20} />
          <Heading size="md" color="blue.500">All Local Packages</Heading>
        </HStack>
        
        {loadAllPackages.state.loading ? (
          <LoadingState message="Loading all packages..." />
        ) : allPackagesData ? (
          formatSortedPackages(allPackagesData, { 
            priorityPrefix: 'contao',
            sectionTitle: 'local package'
          })
        ) : (
          <Box p={4} borderWidth="1px" borderRadius="md">
            No packages data available.
          </Box>
        )}
      </Box>
    </VStack>
  );
};