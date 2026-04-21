import { useQuery } from '@tanstack/react-query';
import { searchConcepts } from '../lib/fields/searchConcepts';
import { useState, useEffect } from 'react';

export function useConceptSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  return useQuery({
    queryKey: ['concepts', debouncedQuery],
    queryFn: ({ signal }) => searchConcepts(debouncedQuery, signal),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}
