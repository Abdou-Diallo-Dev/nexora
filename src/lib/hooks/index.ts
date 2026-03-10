'use client';
import { useState, useEffect } from 'react';

export function usePagination(pageSize = 10) {
  const [page, setPage] = useState(1);
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    setPage,
  };
}

export function useSearch(ms = 300) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), ms);
    return () => clearTimeout(t);
  }, [query, ms]);
  return { query, setQuery, debounced };
}
