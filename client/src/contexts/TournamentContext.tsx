import React, { createContext, useContext, useState, useEffect } from 'react';
import { TeamCandidate, Tournament } from '../types';
import { tournamentAPI } from '../services/api';

interface TournamentContextType {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  fetchTournaments: () => Promise<void>;
  createTournament: (data: { name: string; description: string; type: string; teamCount: number; groupSize?: number; teamCountries?: string[]; selectedTeams?: TeamCandidate[] }) => Promise<void>;
  updateTournament: (id: string, data: Partial<Tournament>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  startTournament: (id: string) => Promise<void>;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const useTournaments = () => {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournaments must be used within a TournamentProvider');
  }
  return context;
};

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchTournaments = async () => {
    if (hasFetched) return; // Prevent duplicate fetches

    setLoading(true);
    setError(null);
    try {
      const response = await tournamentAPI.getAll();
      setTournaments(response.data);
      setHasFetched(true);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async (data: { name: string; description: string; type: string; teamCount: number; groupSize?: number; teamCountries?: string[]; selectedTeams?: TeamCandidate[] }) => {
    try {
      const response = await tournamentAPI.create(data);
      setTournaments([...tournaments, response.data]);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create tournament');
    }
  };

  const updateTournament = async (id: string, data: Partial<Tournament>) => {
    try {
      const response = await tournamentAPI.update(id, data);
      setTournaments(tournaments.map(t => t.id === id ? response.data : t));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update tournament');
    }
  };

  const deleteTournament = async (id: string) => {
    try {
      console.log('Deleting tournament:', id);
      await tournamentAPI.delete(id);
      console.log('Tournament deleted from API, updating state...');
      setTournaments(prevTournaments => {
        const updated = prevTournaments.filter(t => t.id !== id);
        console.log('Updated tournaments list:', updated.length, 'items');
        return updated;
      });
      console.log('State updated successfully');
    } catch (error: any) {
      console.error('Delete tournament error:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete tournament');
    }
  };

  const startTournament = async (id: string) => {
    try {
      const response = await tournamentAPI.start(id);
      setTournaments(tournaments.map(t => t.id === id ? response.data : t));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to start tournament');
    }
  };

  useEffect(() => {
    // Check if user is logged in (has token)
    const token = localStorage.getItem('token');
    if (token && !hasFetched) {
      // Only fetch tournaments if user is logged in
      fetchTournaments();
    } else if (!token) {
      // If no token, mark as fetched to prevent retries
      setHasFetched(true);
      setLoading(false);
    }
  }, [hasFetched]);

  const value = {
    tournaments,
    loading,
    error,
    fetchTournaments,
    createTournament,
    updateTournament,
    deleteTournament,
    startTournament,
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
};
