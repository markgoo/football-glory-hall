import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Shield, Trophy, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

const Home: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const startPath = user ? '/tournaments' : '/register';

  return (
    <div className="mx-auto max-w-7xl">
      <div className="py-20 text-center">
        <h1 className="mb-6 text-5xl font-bold text-gray-900">{t('home.title')}</h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">{t('home.subtitle')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to={startPath} className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700">
            <Trophy className="mr-2 h-5 w-5" />
            {t('home.start')}
          </Link>
          <Link to="/glory-hall" className="inline-flex items-center rounded-lg bg-gray-200 px-6 py-3 text-gray-800 transition-colors hover:bg-gray-300">
            <Shield className="mr-2 h-5 w-5" />
            {t('home.viewHall')}
          </Link>
        </div>
      </div>

      <div className="mb-16 rounded-2xl bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">{t('home.features')}</h2>
            <p className="text-lg text-gray-600">{t('home.featuresSubtitle')}</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Trophy className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{t('home.createCup')}</h3>
              <p className="text-gray-600">{t('home.createCupText')}</p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{t('home.teamManagement')}</h3>
              <p className="text-gray-600">{t('home.teamManagementText')}</p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{t('home.history')}</h3>
              <p className="text-gray-600">{t('home.historyText')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">{t('home.stats')}</h2>
          <p className="text-lg text-gray-600">{t('home.statsSubtitle')}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-blue-600">1,234</div>
            <div className="text-gray-600">{t('home.totalTournaments')}</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-green-600">5,678</div>
            <div className="text-gray-600">{t('home.totalTeams')}</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-purple-600">12,345</div>
            <div className="text-gray-600">{t('home.totalMatches')}</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-red-600">89</div>
            <div className="text-gray-600">{t('home.legendChampions')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
