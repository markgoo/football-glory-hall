import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Shield, TrendingUp, Trophy, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useTournaments } from '../contexts/TournamentContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { tournaments } = useTournaments();
  const { t } = useI18n();

  const activeTournaments = tournaments.filter(tournament => tournament.status === 'active');
  const completedTournaments = tournaments.filter(tournament => tournament.status === 'completed');
  const draftTournaments = tournaments.filter(tournament => tournament.status === 'draft');

  const statusText = (status: string) => {
    if (status === 'active') return t('dashboard.active');
    if (status === 'completed') return t('dashboard.completed');
    return t('dashboard.draft');
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{t('dashboard.welcome', { name: user?.username || '' })}</h1>
        <p className="text-gray-600">{t('dashboard.subtitle')}</p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard icon={<Trophy className="h-6 w-6 text-blue-600" />} color="bg-blue-100" label={t('dashboard.totalTournaments')} value={tournaments.length} />
        <StatCard icon={<Calendar className="h-6 w-6 text-green-600" />} color="bg-green-100" label={t('dashboard.active')} value={activeTournaments.length} />
        <StatCard icon={<Users className="h-6 w-6 text-purple-600" />} color="bg-purple-100" label={t('dashboard.completed')} value={completedTournaments.length} />
        <StatCard icon={<TrendingUp className="h-6 w-6 text-yellow-600" />} color="bg-yellow-100" label={t('dashboard.draft')} value={draftTournaments.length} />
      </div>

      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('dashboard.quickActions')}</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <QuickLink to="/tournaments/new" icon={<Trophy className="mx-auto mb-2 h-8 w-8 text-blue-600" />} label={t('dashboard.createTournament')} color="blue" />
          <QuickLink to="/tournaments" icon={<Calendar className="mx-auto mb-2 h-8 w-8 text-green-600" />} label={t('dashboard.viewTournaments')} color="green" />
          <QuickLink to="/glory-hall" icon={<Trophy className="mx-auto mb-2 h-8 w-8 text-purple-600" />} label={t('nav.gloryHall')} color="purple" />
          {user?.role === 'admin' && (
            <QuickLink to="/admin/users" icon={<Shield className="mx-auto mb-2 h-8 w-8 text-slate-700" />} label={t('nav.userAdmin')} color="slate" />
          )}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('dashboard.recentActivity')}</h2>
          <div className="space-y-4">
            {tournaments.slice(0, 5).map(tournament => (
              <div key={tournament.id} className="border-b pb-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{tournament.name}</h3>
                    <p className="text-sm text-gray-600">{tournament.description}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${tournament.status === 'active' ? 'bg-green-100 text-green-800' : tournament.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {statusText(tournament.status)}
                  </span>
                </div>
              </div>
            ))}
            {tournaments.length === 0 && <p className="py-4 text-center text-gray-500">{t('dashboard.noTournaments')}</p>}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('dashboard.upcomingMatches')}</h2>
          <div className="py-8 text-center text-gray-500">
            <Calendar className="mx-auto mb-2 h-12 w-12 text-gray-400" />
            <p>{t('dashboard.noUpcoming')}</p>
          </div>
        </div>
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

const QuickLink: React.FC<{ to: string; icon: React.ReactNode; label: string; color: 'blue' | 'green' | 'purple' | 'slate' }> = ({ to, icon, label, color }) => {
  const classes = {
    blue: 'bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-600',
    green: 'bg-green-50 border-green-300 hover:bg-green-100 text-green-600',
    purple: 'bg-purple-50 border-purple-300 hover:bg-purple-100 text-purple-600',
    slate: 'bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-700'
  };

  return (
    <Link to={to} className={`flex items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${classes[color]}`}>
      <div className="text-center">
        {icon}
        <p className="font-medium">{label}</p>
      </div>
    </Link>
  );
};

export default Dashboard;
