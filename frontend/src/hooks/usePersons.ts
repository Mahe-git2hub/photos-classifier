import { useState, useEffect, useCallback } from 'react';
import { getPersons } from '../api/client';
import type { Person } from '../types';

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPersons();
      setPersons(data);
    } catch (err) {
      console.error('Failed to load persons:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { persons, loading, refresh: load };
}
