import { useState, useEffect, useCallback } from 'react';

interface UseDataTableOptions {
  initialPageSize?: number;
  initialPage?: number;
  searchDebounceMs?: number;
}

interface PaginationInfo {
  current: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface SortInfo {
  field: string;
  order: 'asc' | 'desc';
}

interface DataTableState {
  data: any[];
  loading: boolean;
  pagination: PaginationInfo;
  sort: SortInfo | null;
  search: string;
  error: string | null;
}

interface UseDataTableReturn {
  state: DataTableState;
  actions: {
    setData: (data: any[]) => void;
    setLoading: (loading: boolean) => void;
    setPagination: (pagination: Partial<PaginationInfo>) => void;
    setSort: (sort: SortInfo | null) => void;
    setSearch: (search: string) => void;
    setError: (error: string | null) => void;
    handlePaginationChange: (page: number, pageSize: number) => void;
    handleSortChange: (sort: SortInfo | null) => void;
    handleSearchChange: (search: string) => void;
    reset: () => void;
  };
}

const useDataTable = (options: UseDataTableOptions = {}): UseDataTableReturn => {
  const {
    initialPageSize = 10,
    initialPage = 1,
    searchDebounceMs = 300,
  } = options;

  const [state, setState] = useState<DataTableState>({
    data: [],
    loading: false,
    pagination: {
      current: initialPage,
      pageSize: initialPageSize,
      total: 0,
      totalPages: 0,
    },
    sort: null,
    search: '',
    error: null,
  });

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const setData = useCallback((data: any[]) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setPagination = useCallback((pagination: Partial<PaginationInfo>) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, ...pagination },
    }));
  }, []);

  const setSort = useCallback((sort: SortInfo | null) => {
    setState(prev => ({ ...prev, sort }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setState(prev => ({ ...prev, search }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const handlePaginationChange = useCallback((page: number, pageSize: number) => {
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        current: page,
        pageSize,
      },
    }));
  }, []);

  const handleSortChange = useCallback((sort: SortInfo | null) => {
    setState(prev => ({
      ...prev,
      sort,
      pagination: {
        ...prev.pagination,
        current: 1, // Reset to first page when sorting
      },
    }));
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      setState(prev => ({
        ...prev,
        search,
        pagination: {
          ...prev.pagination,
          current: 1, // Reset to first page when searching
        },
      }));
    }, searchDebounceMs);

    setSearchTimeout(timeout);
  }, [searchTimeout, searchDebounceMs]);

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      pagination: {
        current: initialPage,
        pageSize: initialPageSize,
        total: 0,
        totalPages: 0,
      },
      sort: null,
      search: '',
      error: null,
    });
  }, [initialPage, initialPageSize]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return {
    state,
    actions: {
      setData,
      setLoading,
      setPagination,
      setSort,
      setSearch,
      setError,
      handlePaginationChange,
      handleSortChange,
      handleSearchChange,
      reset,
    },
  };
};

export default useDataTable;
export type { PaginationInfo, SortInfo, DataTableState, UseDataTableReturn };