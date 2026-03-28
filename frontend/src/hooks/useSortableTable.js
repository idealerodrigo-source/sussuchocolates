import { useState, useMemo } from 'react';

/**
 * Hook para ordenação de tabelas
 * @param {Array} data - Array de dados a serem ordenados
 * @param {Object} defaultSort - Ordenação padrão { key: string, direction: 'asc' | 'desc' }
 */
export function useSortableTable(data, defaultSort = { key: null, direction: 'asc' }) {
  const [sortConfig, setSortConfig] = useState(defaultSort);

  const sortedData = useMemo(() => {
    if (!data || !sortConfig.key) return data;

    const sorted = [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle nested properties (e.g., 'cliente.nome')
      if (sortConfig.key.includes('.')) {
        const keys = sortConfig.key.split('.');
        aValue = keys.reduce((obj, key) => obj?.[key], a);
        bValue = keys.reduce((obj, key) => obj?.[key], b);
      }

      // Handle null/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Handle dates
      if (sortConfig.key.includes('data') || sortConfig.key.includes('Data')) {
        aValue = new Date(aValue).getTime() || 0;
        bValue = new Date(bValue).getTime() || 0;
      }
      // Handle numbers
      else if (typeof aValue === 'number' || typeof bValue === 'number') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      // Handle strings
      else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [data, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return '↕';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getSortClass = (key) => {
    if (sortConfig.key !== key) {
      return 'text-[#8B5A3C]/50';
    }
    return 'text-[#D97706]';
  };

  return { sortedData, requestSort, sortConfig, getSortIcon, getSortClass };
}

/**
 * Componente de cabeçalho de coluna ordenável
 */
export function SortableHeader({ label, sortKey, sortConfig, onSort, className = '' }) {
  const isActive = sortConfig.key === sortKey;
  const icon = !isActive ? '↕' : sortConfig.direction === 'asc' ? '↑' : '↓';
  
  return (
    <th 
      className={`px-4 py-3 text-sm font-sans font-semibold text-[#3E2723] cursor-pointer hover:bg-[#E8D5C4] transition-colors select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className={`text-xs ${isActive ? 'text-[#D97706]' : 'text-[#8B5A3C]/50'}`}>
          {icon}
        </span>
      </div>
    </th>
  );
}
