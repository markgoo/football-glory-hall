import axios from 'axios';
import { User, Tournament, Team, TeamCandidate, Match, HistoricalRecord, AuthResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData: { username: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', userData),
  login: (credentials: { identifier: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', credentials),
  getProfile: () => api.get<{ user: User }>('/auth/profile'),
};

// Tournament API
export const tournamentAPI = {
  getAll: () => api.get<Tournament[]>('/tournaments'),
  getById: (id: string) => api.get<Tournament>(`/tournaments/${id}`),
  create: (data: { name: string; description: string; type: string; teamCategory?: 'club' | 'national'; realTournamentTemplate?: 'fifa_world_cup_2026'; luckyReplacement?: { replacedTeam: string; replacementTeam: string }; teamCount: number; groupSize?: number; teamCountries?: string[]; startTime?: string; selectedTeams?: TeamCandidate[] }) =>
    api.post<Tournament>('/tournaments', data),
  getTeamPool: (data: { teamCount: number; teamCountries?: string[]; teamCategory?: 'club' | 'national' }) =>
    api.post<TeamCandidate[]>('/tournaments/team-pool', data),
  update: (id: string, data: Partial<Tournament>) =>
    api.put<Tournament>(`/tournaments/${id}`, data),
  delete: (id: string) => api.delete(`/tournaments/${id}`),
  start: (id: string) => api.post(`/tournaments/${id}/start`),
};

// Team API
export const teamAPI = {
  getAll: () => api.get<Team[]>('/teams'),
  getById: (id: string) => api.get<Team>(`/teams/${id}`),
  create: (data: { name: string; shortName: string; stats: any }) =>
    api.post<Team>('/teams', data),
  update: (id: string, data: Partial<Team>) =>
    api.put<Team>(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
};

// Match API
export const matchAPI = {
  getAll: () => api.get<Match[]>('/matches'),
  getById: (id: string) => api.get<Match>(`/matches/${id}`),
  simulate: (matchId: string) => api.post(`/matches/${matchId}/simulate`),
  manual: (matchId: string, data: { homeScore: number; awayScore: number; homePenaltyScore?: number; awayPenaltyScore?: number; manualDetails: any }) =>
    api.post(`/matches/${matchId}/manual`, data),
  getStatistics: (matchId: string) => api.get(`/matches/${matchId}/statistics`),
  delete: (matchId: string) => api.delete(`/matches/${matchId}`),
};

// Historical Records API
export const historicalAPI = {
  getAll: () => api.get<HistoricalRecord[]>('/historical'),
  getUserRecords: () => api.get<HistoricalRecord[]>('/historical/user'),
  getStats: () => api.get('/historical/stats'),
  searchRecords: (query: string) => api.get<HistoricalRecord[]>('/historical/search', { params: { query } }),
  getById: (id: string) => api.get<HistoricalRecord>(`/historical/${id}`),
};

export const adminAPI = {
  getUsers: () => api.get<User[]>('/admin/users'),
  updateUser: (id: string, data: { isActive?: boolean; role?: 'user' | 'admin' }) =>
    api.patch<User>(`/admin/users/${id}`, data),
  resetPassword: (id: string, password: string) =>
    api.post(`/admin/users/${id}/reset-password`, { password }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
};

export default api;
