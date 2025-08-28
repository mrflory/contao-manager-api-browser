import React from 'react';
import {
  Table,
  Box,
  Button,
  Input,
  VStack,
  HStack,
  Text,
  IconButton,
  Flex,
} from '@chakra-ui/react';
import {
  LuChevronUp as ChevronUp,
  LuChevronDown as ChevronDown,
  LuChevronsUpDown as ChevronsUpDown,
  LuSearch as Search,
  LuX as X,
} from 'react-icons/lu';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';

interface EnhancedTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  globalFilterPlaceholder?: string;
  enableGlobalFilter?: boolean;
  enableColumnFilters?: boolean;
  enableSorting?: boolean;
  defaultSorting?: SortingState;
}

export function EnhancedTable<TData>({
  data,
  columns,
  globalFilterPlaceholder = "Search all columns...",
  enableGlobalFilter = true,
  enableColumnFilters = false,
  enableSorting = true,
  defaultSorting = [],
}: EnhancedTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  const getSortIcon = (isSorted: false | 'asc' | 'desc') => {
    if (isSorted === 'asc') {
      return <ChevronUp size={14} />;
    }
    if (isSorted === 'desc') {
      return <ChevronDown size={14} />;
    }
    return <ChevronsUpDown size={14} />;
  };

  return (
    <VStack gap={4} align="stretch">
      {enableGlobalFilter && (
        <Box maxW="400px">
          <Box position="relative">
            <Input
              placeholder={globalFilterPlaceholder}
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              size="sm"
              pr="40px"
            />
            {globalFilter ? (
              <IconButton
                size="sm"
                variant="ghost"
                position="absolute"
                right="8px"
                top="50%"
                transform="translateY(-50%)"
                onClick={() => setGlobalFilter('')}
                zIndex={2}
              >
                <X size={14} />
              </IconButton>
            ) : (
              <Box
                position="absolute"
                right="8px"
                top="50%"
                transform="translateY(-50%)"
                pointerEvents="none"
                color="gray.400"
              >
                <Search size={14} />
              </Box>
            )}
          </Box>
        </Box>
      )}

      <Table.ScrollArea borderWidth="1px" borderRadius="lg">
        <Table.Root interactive>
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.ColumnHeader key={header.id}>
                    <VStack gap={2} align="start">
                      <Flex align="center" gap={2}>
                        {header.isPlaceholder ? null : (
                          <>
                            {enableSorting && header.column.getCanSort() ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={header.column.getToggleSortingHandler()}
                                fontWeight="semibold"
                                justifyContent="flex-start"
                                p={0}
                                h="auto"
                                minH="auto"
                                fontSize="sm"
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                <Box ml={2}>
                                  {getSortIcon(header.column.getIsSorted())}
                                </Box>
                              </Button>
                            ) : (
                              <Text fontWeight="semibold" fontSize="sm">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </Text>
                            )}
                          </>
                        )}
                      </Flex>
                      {enableColumnFilters && header.column.getCanFilter() && (
                        <Input
                          placeholder={`Filter ${header.column.columnDef.header}...`}
                          value={(header.column.getFilterValue() ?? '') as string}
                          onChange={(e) => header.column.setFilterValue(e.target.value)}
                          size="xs"
                          fontSize="xs"
                        />
                      )}
                    </VStack>
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body>
            {table.getRowModel().rows.map((row) => (
              <Table.Row key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>

      {table.getFilteredRowModel().rows.length === 0 && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">No results found</Text>
          {(globalFilter || columnFilters.length > 0) && (
            <HStack justify="center" mt={2}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setGlobalFilter('');
                  setColumnFilters([]);
                }}
              >
                Clear filters
              </Button>
            </HStack>
          )}
        </Box>
      )}
    </VStack>
  );
}