import React, { createContext, useContext, useState, useEffect } from 'react';
import { TeamCandidate, Tournament } from '../types';
import { tournamentAPI } from '../services/api';
import { useAuth } from './AuthContext';

interface TournamentContextType {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  fetchTournaments: () => Promise<void>;
  createTournament: (data: { name: string; description: string; type: string; teamCategory?: 'club' | 'national'; realTournamentTemplate?: 'fifa_world_cup_2026'; luckyReplacement?: { replacedTeam: string; replacementTeam: string }; teamCount: number; groupSize?: number; teamCountries?: string[]; startTime?: string; selectedTeams?: TeamCandidate[] }) => Promise<void>;
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
  const { token, user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = async () => {
    if (!localStorage.getItem('token')) {
      setTournaments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await tournamentAPI.getAll();
      setTournaments(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async (data: { name: string; description: string; type: string; teamCategory?: 'club' | 'national'; realTournamentTemplate?: 'fifa_world_cup_2026'; luckyReplacement?: { replacedTeam: string; replacementTeam: string }; teamCount: number; groupSize?: number; teamCountries?: string[]; startTime?: string; selectedTeams?: TeamCandidate[] }) => {
    try {
      await tournamentAPI.create(data);
      await fetchTournaments();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create tournament');
    }
  };

  const updateTournament = async (id: string, data: Partial<Tournament>) => {
    try {
      await tournamentAPI.update(id, data);
      await fetchTournaments();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update tournament');
    }
  };

  const deleteTournament = async (id: string) => {
    try {
      console.log('Deleting tournament:', id);
      await tournamentAPI.delete(id);
      await fetchTournaments();
    } catch (error: any) {
      console.error('Delete tournament error:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete tournament');
    }
  };

  const startTournament = async (id: string) => {
    try {
      await tournamentAPI.start(id);
      await fetchTournaments();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to start tournament');
    }
  };

  useEffect(() => {
    if (token && user?.id) {
      fetchTournaments();
    } else {
      setTournaments([]);
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
        fetchTournaments();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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
