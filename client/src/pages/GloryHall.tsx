import React, { useEffect, useState } from 'react';
import { Award, Calendar, Crown, Medal, Search, Trophy } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { historicalAPI } from '../services/api';
import { HistoricalRecord } from '../types';

const GloryHall: React.FC = () => {
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useI18n();

  const fetchData = async () => {
    try {
      const [recordsResponse] = await Promise.all([
        historicalAPI.getAll(),
        historicalAPI.getUserRecords()
      ]);
      setRecords(recordsResponse.data);
      setStats({
        totalRecords: recordsResponse.data.length,
        userRecords: recordsResponse.data.length
      });
    } catch (error) {
      console.error('Failed to fetch glory hall data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchTerm.trim()) {
      void fetchData();
      return;
    }

    try {
      const response = await historicalAPI.searchRecords(searchTerm);
      setRecords(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'tournament_winner':
        return <Crown className="h-5 w-5" />;
      case 'tournament_runner_up':
        return <Medal className="h-5 w-5" />;
      case 'best_team':
        return <Trophy className="h-5 w-5" />;
      case 'best_manager':
        return <Award className="h-5 w-5" />;
      default:
        return <Trophy className="h-5 w-5" />;
    }
  };

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'tournament_winner':
        return 'bg-yellow-50 text-yellow-600';
      case 'tournament_runner_up':
        return 'bg-gray-50 text-gray-600';
      case 'best_team':
        return 'bg-blue-50 text-blue-600';
      case 'best_manager':
        return 'bg-purple-50 text-purple-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const achievementText = (type: string) => {
    if (type === 'tournament_winner') return t('glory.champion');
    if (type === 'tournament_runner_up') return t('glory.runnerUp');
    return t('glory.honorRecord');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="mb-4 flex items-center justify-center text-4xl font-bold text-gray-900">
          <Trophy className="mr-3 h-10 w-10 text-yellow-500" />
          {t('glory.title')}
        </h1>
        <p className="text-lg text-gray-600">{t('glory.subtitle')}</p>
      </div>

      {stats && (
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <StatCard icon={<Trophy className="h-6 w-6 text-yellow-600" />} color="bg-yellow-100" label={t('glory.totalRecords')} value={stats.totalRecords} />
          <StatCard icon={<Crown className="h-6 w-6 text-blue-600" />} color="bg-blue-100" label={t('glory.myRecords')} value={stats.userRecords} />
          <StatCard icon={<Calendar className="h-6 w-6 text-green-600" />} color="bg-green-100" label={t('glory.thisYear')} value={records.filter(record => record.year === new Date().getFullYear()).length} />
          <StatCard icon={<Medal className="h-6 w-6 text-purple-600" />} color="bg-purple-100" label={t('glory.recentRecords')} value={records.slice(0, 5).length} />
        </div>
      )}

      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('glory.searchPlaceholder')} className="input w-full pl-10" />
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">{t('glory.search')}</button>
          <button type="button" onClick={() => { setSearchTerm(''); void fetchData(); }} className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400">{t('glory.reset')}</button>
        </form>
      </div>

      <div className="space-y-6">
        {records.length === 0 ? (
          <div className="py-12 text-center">
            <Trophy className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">{t('glory.emptyTitle')}</h3>
            <p className="text-gray-600">{t('glory.emptyText')}</p>
          </div>
        ) : (
          records.map(record => (
            <div key={record.id} className="rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className={`rounded-lg p-2 ${getAchievementColor(record.achievementType)}`}>{getAchievementIcon(record.achievementType)}</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{record.tournamentName}</h3>
                    <p className="text-sm text-gray-600">{record.year} · {achievementText(record.achievementType)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{record.winner}</p>
                  <p className="text-sm text-gray-600">{t('glory.champion')}</p>
                </div>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 font-medium text-gray-900">{t('glory.topThree')}</h4>
                  <div className="space-y-1">
                    {record.topTeams.map((team, index) => (
                      <div key={team} className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">{index + 1}.</span>
                        <span className="text-sm text-gray-900">{team}</span>
                        {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                        {index === 1 && <Medal className="h-4 w-4 text-gray-500" />}
                        {index === 2 && <Award className="h-4 w-4 text-orange-500" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 font-medium text-gray-900">{t('glory.statistics')}</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    {record.statistics?.totalMatches && <p>{t('glory.totalMatches')}: {record.statistics.totalMatches}</p>}
                    {record.statistics?.totalGoals && <p>{t('glory.totalGoals')}: {record.statistics.totalGoals}</p>}
                    {record.statistics?.averageGoals && <p>{t('glory.averageGoals')}: {record.statistics.averageGoals.toFixed(1)}</p>}
                    {record.statistics?.participation && <p>{t('glory.participatingTeams')}: {record.statistics.participation}</p>}
                  </div>
                </div>
              </div>

              {record.description && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-700">{record.description}</p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-500">{t('glory.createdAt')} {new Date(record.createdAt).toLocaleDateString()}</div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{record.year}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; color: string; label: string; value: number }> = ({ icon, color, label, value }) => (
  <div className="rounded-lg bg-white p-6 shadow">
    <div className="flex items-center">
      <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

export default GloryHall;
