import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import Card from './card';
import Loading from './Loading';
import { Select } from './Dropdown';

interface Column<T = any> {
  key: string;
  title: string;
  dataIndex?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
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

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationInfo;
  onPaginationChange?: (page: number, pageSize: number) => void;
  onSortChange?: (sort: SortInfo | null) => void;
  onSearch?: (searchText: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  rowKey?: string | ((record: T) => string);
  className?: string;
  emptyText?: string;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
  rowSelection?: {
    selectedRowKeys: string[];
    onChange: (selectedRowKeys: string[], selectedRows: T[]) => void;
  };
}

const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  onPaginationChange,
  onSortChange,
  onSearch,
  searchable = false,
  searchPlaceholder = 'Cari...',
  rowKey = 'id',
  className,
  emptyText = 'Tidak ada data tersedia',
  showSizeChanger = true,
  pageSizeOptions = [10, 20, 50, 100],
  rowSelection,
}: DataTableProps<T>) => {
  const [searchText, setSearchText] = useState('');
  const [sortInfo, setSortInfo] = useState<SortInfo | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Handle indeterminate state for select all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current && rowSelection) {
      const isIndeterminate = rowSelection.selectedRowKeys.length > 0 && rowSelection.selectedRowKeys.length < data.length;
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [rowSelection?.selectedRowKeys, data.length]);

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    const field = column.dataIndex || column.key;
    let newSortInfo: SortInfo | null = null;

    if (!sortInfo || sortInfo.field !== field) {
      newSortInfo = { field, order: 'asc' };
    } else if (sortInfo.order === 'asc') {
      newSortInfo = { field, order: 'desc' };
    } else {
      newSortInfo = null;
    }

    setSortInfo(newSortInfo);
    onSortChange?.(newSortInfo);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    onSearch?.(value);
  };

  const handlePageChange = (page: number) => {
    if (pagination && onPaginationChange) {
      onPaginationChange(page, pagination.pageSize);
    }
  };

  const handlePageSizeChange = (pageSize: string) => {
    if (pagination && onPaginationChange) {
      onPaginationChange(1, parseInt(pageSize));
    }
  };

  const renderCell = (column: Column<T>, record: T, index: number) => {
    const value = column.dataIndex ? record[column.dataIndex] : record[column.key];
    
    if (column.render) {
      return column.render(value, record, index);
    }
    
    return value;
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;

    const field = column.dataIndex || column.key;
    const isActive = sortInfo?.field === field;
    
    return (
      <span className="ml-1 inline-flex flex-col">
        <svg
          className={cn(
            'w-3 h-3 -mb-1',
            isActive && sortInfo?.order === 'asc' ? 'text-primary-600' : 'text-gray-400'
          )}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
        <svg
          className={cn(
            'w-3 h-3 rotate-180',
            isActive && sortInfo?.order === 'desc' ? 'text-primary-600' : 'text-gray-400'
          )}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </span>
    );
  };

  const renderPagination = () => {
    if (!pagination) return null;

    const { current, pageSize, total, totalPages } = pagination;
    const startItem = (current - 1) * pageSize + 1;
    const endItem = Math.min(current * pageSize, total);

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (current <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        } else if (current >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = current - 1; i <= current + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">
            Menampilkan {startItem} sampai {endItem} dari {total} hasil
          </span>
          {showSizeChanger && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Tampilkan:</span>
              <Select
                options={pageSizeOptions.map(size => ({
                  label: size.toString(),
                  value: size.toString(),
                }))}
                value={pageSize.toString()}
                onChange={handlePageSizeChange}
                className="w-20"
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handlePageChange(current - 1)}
            disabled={current === 1}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-gray-500">...</span>
              ) : (
                <button
                  onClick={() => handlePageChange(page as number)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    current === page
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
          
          <button
            onClick={() => handlePageChange(current + 1)}
            disabled={current === totalPages}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn('overflow-hidden', className)} padding="none">
      {/* Search Bar */}
      {searchable && (
        <div className="p-6 border-b border-gray-200">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {rowSelection && (
                <th className="px-6 py-3 text-left">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allKeys = data.map((record, index) => getRowKey(record, index));
                        rowSelection.onChange(allKeys, data);
                      } else {
                        rowSelection.onChange([], []);
                      }
                    }}
                    checked={rowSelection.selectedRowKeys.length === data.length && data.length > 0}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer hover:bg-gray-100',
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center">
                    {column.title}
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (rowSelection ? 1 : 0)} className="px-6 py-12 text-center">
                  <Loading size="lg" text="Memuat data..." />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowSelection ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((record, index) => {
                const key = getRowKey(record, index);
                const isSelected = rowSelection?.selectedRowKeys.includes(key);
                
                return (
                  <tr
                    key={key}
                    className={cn(
                      'hover:bg-gray-50 transition-colors',
                      isSelected && 'bg-primary-50'
                    )}
                  >
                    {rowSelection && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelectedKeys = e.target.checked
                              ? [...rowSelection.selectedRowKeys, key]
                              : rowSelection.selectedRowKeys.filter(k => k !== key);
                            const newSelectedRows = data.filter((r, i) => 
                              newSelectedKeys.includes(getRowKey(r, i))
                            );
                            rowSelection.onChange(newSelectedKeys, newSelectedRows);
                          }}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.className
                        )}
                      >
                        {renderCell(column, record, index)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </Card>
  );
};

export default DataTable;
