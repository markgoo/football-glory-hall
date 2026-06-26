import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Play, Plus, Trash2, Trophy } from 'lucide-react';
import { useTournaments } from '../contexts/TournamentContext';
import { useI18n } from '../contexts/I18nContext';
import { tournamentAPI } from '../services/api';
import { TeamCandidate, Tournament } from '../types';
import { TeamNameWithFlag } from '../utils/flags';
import { unCountryOptions } from '../data/unCountries';
import { getCountryNameZh } from '../data/countryNamesZh';

type TournamentForm = {
  name: string;
  description: string;
  type: 'knockout' | 'league' | 'group_knockout';
  teamCategory: 'club' | 'national';
  teamCount: number;
  groupSize: number;
  teamCountries: string[];
  startTime: string;
};

const getDefaultStartTime = () => {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultForm: TournamentForm = {
  name: '',
  description: '',
  type: 'knockout',
  teamCategory: 'club',
  teamCount: 16,
  groupSize: 4,
  teamCountries: [],
  startTime: getDefaultStartTime()
};

const isTournamentFullyCompleted = (tournament: Tournament) => {
  if (tournament.status === 'completed') return true;
  const playableMatches = (tournament.matches || []).filter(match => match.homeTeam && match.awayTeam);
  return playableMatches.length > 0 && playableMatches.every(match => match.status === 'completed');
};

const worldCup2026Teams = [
  'Mexico', 'South Africa', 'South Korea', 'Czech Republic', 'Canada', 'Bosnia and Herzegovina',
  'Qatar', 'Switzerland', 'Brazil', 'Morocco', 'Haiti', 'Scotland', 'USA', 'Paraguay',
  'Australia', 'Turkey', 'Germany', 'Curacao', 'Ivory Coast', 'Ecuador', 'Netherlands',
  'Japan', 'Sweden', 'Tunisia', 'Belgium', 'Egypt', 'Iran', 'New Zealand', 'Spain',
  'Cape Verde', 'Saudi Arabia', 'Uruguay', 'France', 'Senegal', 'Iraq', 'Norway',
  'Argentina', 'Algeria', 'Austria', 'Jordan', 'Portugal', 'Democratic Republic of the Congo',
  'Uzbekistan', 'Colombia', 'England', 'Croatia', 'Ghana', 'Panama'
];

const countryOptions = [
  { value: 'England', label: '英格兰' },
  { value: 'Spain', label: '西班牙' },
  { value: 'Italy', label: '意大利' },
  { value: 'Germany', label: '德国' },
  { value: 'France', label: '法国' },
  { value: 'Netherlands', label: '荷兰' },
  { value: 'Portugal', label: '葡萄牙' },
  { value: 'Turkey', label: '土耳其' },
  { value: 'Scotland', label: '苏格兰' },
  { value: 'Belgium', label: '比利时' },
  { value: 'Austria', label: '奥地利' },
  { value: 'Switzerland', label: '瑞士' },
  { value: 'Greece', label: '希腊' },
  { value: 'Denmark', label: '丹麦' },
  { value: 'Sweden', label: '瑞典' },
  { value: 'Norway', label: '挪威' },
  { value: 'Croatia', label: '克罗地亚' },
  { value: 'Czech Republic', label: '捷克' },
  { value: 'Ukraine', label: '乌克兰' },
  { value: 'Brazil', label: '巴西' },
  { value: 'Argentina', label: '阿根廷' },
  { value: 'Colombia', label: '哥伦比亚' },
  { value: 'Uruguay', label: '乌拉圭' },
  { value: 'Chile', label: '智利' },
  { value: 'USA', label: '美国' },
  { value: 'Mexico', label: '墨西哥' },
  { value: 'Saudi Arabia', label: '沙特' },
  { value: 'Japan', label: '日本' },
  { value: 'China', label: '中国' },
  { value: 'South Korea', label: '韩国' },
  { value: 'Qatar', label: '卡塔尔' },
  { value: 'United Arab Emirates', label: '阿联酋' },
  { value: 'Australia', label: '澳大利亚' }
];

const countryRegions: Record<string, string> = {
  England: 'europe',
  Spain: 'europe',
  Italy: 'europe',
  Germany: 'europe',
  France: 'europe',
  Netherlands: 'europe',
  Portugal: 'europe',
  Turkey: 'europe',
  Scotland: 'europe',
  Belgium: 'europe',
  Austria: 'europe',
  Switzerland: 'europe',
  Greece: 'europe',
  Denmark: 'europe',
  Sweden: 'europe',
  Norway: 'europe',
  Croatia: 'europe',
  'Czech Republic': 'europe',
  Ukraine: 'europe',
  Brazil: 'south-america',
  Argentina: 'south-america',
  Colombia: 'south-america',
  Uruguay: 'south-america',
  Chile: 'south-america',
  USA: 'north-america',
  Mexico: 'north-america',
  'Saudi Arabia': 'asia',
  Japan: 'asia',
  China: 'asia',
  'South Korea': 'asia',
  Qatar: 'asia',
  'United Arab Emirates': 'asia',
  Australia: 'oceania'
};

const regionOptions = [
  { value: 'europe', label: '欧洲' },
  { value: 'south-america', label: '南美洲' },
  { value: 'north-america', label: '北美洲' },
  { value: 'asia', label: '亚洲' },
  { value: 'oceania', label: '大洋洲' }
];

const countryGroups = regionOptions.map(region => ({
  ...region,
  countries: countryOptions.filter(country => countryRegions[country.value] === region.value)
}));

const countryPresets = [
  { label: '五大联赛', countries: ['England', 'Spain', 'Italy', 'Germany', 'France'] },
  { label: '欧洲主流', countries: ['England', 'Spain', 'Italy', 'Germany', 'France', 'Netherlands', 'Portugal', 'Turkey', 'Belgium', 'Austria', 'Scotland'] },
  { label: '欧美强队', countries: ['England', 'Spain', 'Italy', 'Germany', 'France', 'Brazil', 'Argentina', 'USA', 'Mexico'] },
  { label: '亚洲邀请赛', countries: ['Saudi Arabia', 'Japan', 'South Korea', 'China', 'Qatar', 'United Arab Emirates', 'Australia'] },
  { label: '南美解放者', countries: ['Brazil', 'Argentina', 'Colombia', 'Uruguay', 'Chile'] },
  { label: '全球混合', countries: ['England', 'Spain', 'Italy', 'Germany', 'France', 'Brazil', 'Argentina', 'USA', 'Mexico', 'Saudi Arabia', 'Japan', 'South Korea'] }
];

const TournamentManager: React.FC = () => {
  const { language, t } = useI18n();
  const { tournaments, loading, error, createTournament, deleteTournament, startTournament } = useTournaments();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<TournamentForm>(defaultForm);
  const [authError, setAuthError] = useState<string | null>(null);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [teamPool, setTeamPool] = useState<TeamCandidate[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [loadingTeamPool, setLoadingTeamPool] = useState(false);
  const [creatingWorldCup, setCreatingWorldCup] = useState(false);
  const [showWorldCupDialog, setShowWorldCupDialog] = useState(false);
  const [luckyRolling, setLuckyRolling] = useState(false);
  const [luckyCurrent, setLuckyCurrent] = useState('Mexico');
  const [luckyWinner, setLuckyWinner] = useState<string | null>(null);

  useEffect(() => {
    if (error && !authError) {
      setAuthError(error);
    }
  }, [error, authError]);

  const getSelectedTeams = () => {
    return selectedTeamIds
      .map(id => teamPool.find(team => team.id === id))
      .filter(Boolean) as TeamCandidate[];
  };
  const hasEnoughTeamPool = teamPool.length >= formData.teamCount;
  const activeCountryOptions = formData.teamCategory === 'national' ? unCountryOptions : countryOptions;
  const activeCountryLabelMap = activeCountryOptions.reduce<Record<string, string>>((labels, country) => {
    labels[country.value] = country.label;
    return labels;
  }, {});
  const activeCountryGroups = formData.teamCategory === 'national'
    ? [{ value: 'un', label: 'UN 国家与观察员', countries: activeCountryOptions }]
    : countryGroups;
  const translateCountryLabel = (country: { value: string; label: string }) => language === 'en' ? country.value : country.label;
  const translateGroupLabel = (label: string) => {
    if (language === 'zh') return label;
    const map: Record<string, string> = {
      '欧洲': 'Europe',
      '南美洲': 'South America',
      '北美洲': 'North America',
      '亚洲': 'Asia',
      '大洋洲': 'Oceania',
      'UN 国家与观察员': 'UN Members and Observers'
    };
    return map[label] || label;
  };
  const translatePresetLabel = (label: string) => {
    if (language === 'zh') return label;
    const map: Record<string, string> = {
      '五大联赛': 'Top 5 Leagues',
      '欧洲主流': 'Mainstream Europe',
      '欧美强队': 'Europe & Americas',
      '亚洲邀请赛': 'Asian Invitational',
      '南美解放者': 'South America',
      '全球混合': 'Global Mix'
    };
    return map[label] || label;
  };
  const formatActiveCountrySelection = (countries?: string[]) => {
    if (!countries || countries.length === 0) return t('tournament.form.global');
    return countries.map(country => language === 'en' ? country : activeCountryLabelMap[country] || country).join(language === 'en' ? ', ' : '、');
  };
  const formatTournamentCountrySelection = (countries?: string[]) => {
    if (!countries || countries.length === 0) return t('tournament.form.global');
    return countries.map(country => language === 'en' ? country : getCountryNameZh(country)).join(language === 'en' ? ', ' : '、');
  };
  const getLuckyCountryName = (country: string) => language === 'en' ? country : getCountryNameZh(country);
  const getTournamentTypeLabel = (type: string) => {
    if (type === 'knockout') return t('tournament.form.type.knockout');
    if (type === 'league') return t('tournament.form.type.league');
    return t('tournament.form.type.groupKnockout');
  };

  const autoSelectTeams = (pool: TeamCandidate[] = teamPool) => {
    setSelectedTeamIds(
      [...pool]
        .sort((a, b) => (b.strength || 0) - (a.strength || 0))
        .slice(0, formData.teamCount)
        .map(team => team.id)
    );
  };

  const handleLoadTeamPool = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setLoadingTeamPool(true);
      const response = await tournamentAPI.getTeamPool({
        teamCount: formData.teamCount,
        teamCountries: formData.teamCountries.length > 0 ? formData.teamCountries : undefined,
        teamCategory: formData.teamCategory
      });

      setTeamPool(response.data);
      setCreateStep(2);
      autoSelectTeams(response.data);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || t('tournament.error.loadTeams'));
    } finally {
      setLoadingTeamPool(false);
    }
  };

  const handleCreateTournament = async (event: React.FormEvent) => {
    event.preventDefault();

    const selectedTeams = getSelectedTeams();
    if (selectedTeams.length !== formData.teamCount) {
      alert(t('tournament.error.selectTeams', { count: formData.teamCount }));
      return;
    }

    try {
      await createTournament({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        teamCategory: formData.teamCategory,
        teamCount: formData.teamCount,
        groupSize: formData.type === 'group_knockout' ? formData.groupSize : undefined,
        teamCountries: formData.teamCountries.length > 0 ? formData.teamCountries : undefined,
        startTime: new Date(formData.startTime).toISOString(),
        selectedTeams
      });

      closeCreateDialog();
    } catch (err: any) {
      alert(err.message || t('tournament.error.createFailed'));
    }
  };

  const createWorldCup2026 = async (replacementTeam?: string) => {
    try {
      setCreatingWorldCup(true);
      await createTournament({
        name: t('tournament.worldCupName'),
        description: t('tournament.worldCupDescription'),
        type: 'group_knockout',
        teamCategory: 'national',
        realTournamentTemplate: 'fifa_world_cup_2026',
        luckyReplacement: replacementTeam ? { replacedTeam: replacementTeam, replacementTeam: 'China' } : undefined,
        teamCount: 48,
        groupSize: 4,
        startTime: '2026-06-11T20:00:00.000Z'
      });
      setShowWorldCupDialog(false);
      setLuckyWinner(null);
    } catch (err: any) {
      alert(err.message || t('tournament.error.createWorldCupFailed'));
    } finally {
      setCreatingWorldCup(false);
    }
  };

  const startLuckyDraw = () => {
    if (luckyRolling) return;
    setLuckyWinner(null);
    setLuckyRolling(true);
    let ticks = 0;
    const totalTicks = 42 + Math.floor(Math.random() * 18);
    const timer = window.setInterval(() => {
      ticks += 1;
      const nextTeam = worldCup2026Teams[Math.floor(Math.random() * worldCup2026Teams.length)];
      setLuckyCurrent(nextTeam);
      if (ticks >= totalTicks) {
        window.clearInterval(timer);
        setLuckyRolling(false);
        setLuckyWinner(nextTeam);
      }
    }, 75);
  };

  const toggleTeamCountry = (country: string) => {
    setFormData(current => ({
      ...current,
      teamCountries: current.teamCountries.includes(country)
        ? current.teamCountries.filter(item => item !== country)
        : [...current.teamCountries, country]
    }));
  };

  const applyCountryPreset = (countries: string[]) => {
    setFormData(current => ({ ...current, teamCountries: countries }));
  };

  const toggleCountryRegion = (countries: string[]) => {
    setFormData(current => {
      const allSelected = countries.every(country => current.teamCountries.includes(country));
      return {
        ...current,
        teamCountries: allSelected
          ? current.teamCountries.filter(country => !countries.includes(country))
          : Array.from(new Set([...current.teamCountries, ...countries]))
      };
    });
  };

  const toggleSelectedTeam = (teamId: string) => {
    setSelectedTeamIds(current => {
      if (current.includes(teamId)) {
        return current.filter(id => id !== teamId);
      }
      if (current.length >= formData.teamCount) {
        return current;
      }
      return [...current, teamId];
    });
  };

  const closeCreateDialog = () => {
    setShowCreateForm(false);
    setFormData({ ...defaultForm, startTime: getDefaultStartTime() });
    setCreateStep(1);
    setTeamPool([]);
    setSelectedTeamIds([]);
  };

  const handleDeleteTournament = async (id: string) => {
    if (!window.confirm(t('tournament.deleteConfirm'))) return;

    try {
      await deleteTournament(id);
    } catch (err: any) {
      alert(err.message || t('tournament.error.deleteFailed'));
    }
  };

  const handleStartTournament = async (id: string) => {
    try {
      await startTournament(id);
    } catch (err: any) {
      alert(err.message || t('tournament.error.startFailed'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {authError && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{authError}</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('tournament.title')}</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('tournament.createNew')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setShowWorldCupDialog(true)} disabled={creatingWorldCup} className="flex items-center bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"><Trophy className="w-5 h-5 mr-2" />{t('tournament.oneClickWorldCup')}</button>
      </div>

      {showWorldCupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('tournament.createWorldCupTitle')}</h2>
              <button type="button" onClick={() => setShowWorldCupDialog(false)} className="text-gray-500 hover:text-gray-700">{t('common.close')}</button>
            </div>
            <div className="rounded-lg border bg-emerald-50 p-4 mb-4">
              <div className="font-semibold text-gray-900">{t('tournament.worldCupTemplate')}</div>
              <p className="text-sm text-gray-700 mt-1">{t('tournament.createWorldCupDesc')}</p>
              <button type="button" onClick={() => createWorldCup2026()} disabled={creatingWorldCup || luckyRolling} className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50">
                {creatingWorldCup ? t('tournament.creating') : t('tournament.confirmOriginalWorldCup')}
              </button>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('tournament.luckyTitle')}</h3>
            <div className="border rounded-lg bg-gray-50 p-6 text-center">
              <div className={`mx-auto mb-4 min-h-[80px] flex items-center justify-center rounded border bg-white ${luckyRolling ? 'animate-pulse' : ''}`}>
                <TeamNameWithFlag team={{ name: getLuckyCountryName(luckyCurrent), country: luckyCurrent, logo: null } as any} flagClassName="w-12 h-8 flex-shrink-0" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{getLuckyCountryName(luckyWinner || luckyCurrent)}</div>
              <p className="mt-2 text-sm text-gray-600">{t('tournament.luckyDescription')}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={startLuckyDraw} disabled={luckyRolling || creatingWorldCup} className="flex-1 bg-amber-600 text-white py-2 rounded hover:bg-amber-700 disabled:opacity-50">{luckyRolling ? t('tournament.rolling') : t('tournament.startLuckyDraw')}</button>
              <button type="button" onClick={() => luckyWinner && createWorldCup2026(luckyWinner)} disabled={!luckyWinner || luckyRolling || creatingWorldCup} className="flex-1 bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 disabled:opacity-50">{t('tournament.createWorldCup')}</button>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t('tournament.form.title')}</h2>
              <div className="text-sm text-gray-500">{t('tournament.form.step', { step: createStep })}</div>
            </div>

            <form onSubmit={createStep === 1 ? handleLoadTeamPool : handleCreateTournament}>
              {createStep === 1 && (
                <>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, teamCategory: 'club', teamCountries: [] })}
                      className={`rounded-lg border p-4 text-left transition ${formData.teamCategory === 'club' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                    >
                      <div className="text-lg font-semibold text-gray-900">{t('tournament.form.club')}</div>
                      <div className="text-sm text-gray-600 mt-1">{t('tournament.form.clubDesc')}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, teamCategory: 'national', teamCountries: [] })}
                      className={`rounded-lg border p-4 text-left transition ${formData.teamCategory === 'national' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                    >
                      <div className="text-lg font-semibold text-gray-900">{t('tournament.form.national')}</div>
                      <div className="text-sm text-gray-600 mt-1">{t('tournament.form.nationalDesc')}</div>
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('tournament.form.name')}</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                        className="input w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('tournament.form.type')}</label>
                      <select
                        value={formData.type}
                        onChange={(event) => setFormData({ ...formData, type: event.target.value as TournamentForm['type'] })}
                        className="input w-full"
                      >
                        <option value="knockout">{t('tournament.form.type.knockout')}</option>
                        <option value="league">{t('tournament.form.type.league')}</option>
                        <option value="group_knockout">{t('tournament.form.type.groupKnockout')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('tournament.form.description')}</label>
                    <textarea
                      value={formData.description}
                      onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                      className="input w-full"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('tournament.form.startTime')}</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(event) => setFormData({ ...formData, startTime: event.target.value })}
                      className="input w-full"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('tournament.form.startTimeHelp')}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('tournament.form.teamCount')}</label>
                      <select
                        value={formData.teamCount}
                        onChange={(event) => setFormData({ ...formData, teamCount: parseInt(event.target.value, 10) })}
                        className="input w-full"
                      >
                        <option value="8">{t('tournament.form.teamsCount', { count: 8 })}</option>
                        <option value="16">{t('tournament.form.teamsCount', { count: 16 })}</option>
                        <option value="32">{t('tournament.form.teamsCount', { count: 32 })}</option>
                        <option value="64">{t('tournament.form.teamsCount', { count: 64 })}</option>
                        <option value="128">{t('tournament.form.teamsCount', { count: 128 })}</option>
                      </select>
                    </div>

                    {formData.type === 'group_knockout' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('tournament.form.groupSize')}</label>
                        <select
                          value={formData.groupSize}
                          onChange={(event) => setFormData({ ...formData, groupSize: parseInt(event.target.value, 10) })}
                          className="input w-full"
                        >
                          <option value="2">{t('tournament.form.groupTeams', { count: 2 })}</option>
                          <option value="4">{t('tournament.form.groupTeams', { count: 4 })}</option>
                          <option value="8">{t('tournament.form.groupTeams', { count: 8 })}</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">{t('tournament.form.groupHelp', { count: formData.teamCount / formData.groupSize })}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">{t('tournament.form.countries')}</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, teamCountries: [] })}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {t('tournament.form.global')}
                      </button>
                    </div>

                    <div className="border rounded-lg p-3 space-y-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-2">{t('tournament.form.presets')}</div>
                        <div className="flex flex-wrap gap-2">
                          {countryPresets.map(preset => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => applyCountryPreset(preset.countries)}
                              className="px-3 py-1.5 rounded border text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                            >
                              {translatePresetLabel(preset.label)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-4">
                        {activeCountryGroups.map(group => {
                          const groupCountries = group.countries.map(country => country.value);
                          const selectedCount = groupCountries.filter(country => formData.teamCountries.includes(country)).length;

                          return (
                            <div key={group.value} className="border rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="font-medium text-gray-900">{translateGroupLabel(group.label)}</div>
                                  <div className="text-xs text-gray-500">{selectedCount} / {groupCountries.length}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleCountryRegion(groupCountries)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  {selectedCount === groupCountries.length ? t('tournament.form.clearRegion') : t('tournament.form.selectRegion')}
                                </button>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {group.countries.map(country => (
                                  <label key={country.value} className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                      type="checkbox"
                                      checked={formData.teamCountries.includes(country.value)}
                                      onChange={() => toggleTeamCountry(country.value)}
                                    />
                                    {translateCountryLabel(country)}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t('tournament.form.current', { value: formatActiveCountrySelection(formData.teamCountries) })}</p>
                  </div>
                </>
              )}

              {createStep === 2 && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t('tournament.form.selectTeams')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('tournament.form.selectedTeams', { selected: selectedTeamIds.length, total: formData.teamCount, range: formatActiveCountrySelection(formData.teamCountries) })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => autoSelectTeams()} className="px-3 py-2 rounded bg-blue-100 text-blue-700 text-sm hover:bg-blue-200">
                        {t('tournament.form.autoSelect')}
                      </button>
                      <button type="button" onClick={() => setSelectedTeamIds([])} className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
                        {t('tournament.form.clear')}
                      </button>
                      <button type="button" onClick={() => setCreateStep(1)} className="px-3 py-2 rounded border text-gray-700 text-sm hover:bg-gray-50">
                        {t('tournament.form.previous')}
                      </button>
                    </div>
                  </div>
                  {!hasEnoughTeamPool && (
                    <div className="mb-3 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                      {t('tournament.form.notEnoughTeams', { found: teamPool.length, required: formData.teamCount })}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[52vh] overflow-y-auto pr-1">
                    {teamPool.map(team => {
                      const selected = selectedTeamIds.includes(team.id);
                      const disabled = !selected && selectedTeamIds.length >= formData.teamCount;

                      return (
                        <button
                          key={team.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleSelectedTeam(team.id)}
                          className={`text-left border rounded p-3 transition ${
                            selected
                              ? 'border-blue-500 bg-blue-50'
                              : disabled
                              ? 'border-gray-200 bg-gray-50 opacity-60'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-gray-900"><TeamNameWithFlag team={team} flagClassName="w-5 h-4 flex-shrink-0" logoClassName="w-5 h-5 flex-shrink-0" /></div>
                              <div className="text-xs text-gray-500">{team.country || 'Unknown'} · {team.shortName}</div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">{team.strength}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex space-x-4 mt-5">
                <button type="submit" disabled={loadingTeamPool || (createStep === 2 && !hasEnoughTeamPool)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {createStep === 1 ? (loadingTeamPool ? t('tournament.form.loadingTeams') : t('tournament.form.nextTeams')) : t('tournament.form.create')}
                </button>
                <button
                  type="button"
                  onClick={closeCreateDialog}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => {
            const fullyCompleted = isTournamentFullyCompleted(tournament);
            return (
            <div key={tournament.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{tournament.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{tournament.description}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${
                  fullyCompleted
                    ? 'bg-gray-100 text-gray-800'
                    : tournament.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {fullyCompleted ? t('tournament.status.completedAll') : tournament.status === 'active' ? t('tournament.status.active') : t('tournament.status.draft')}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('tournament.card.type')}</span>
                  <span>{getTournamentTypeLabel(tournament.type)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('tournament.card.teamCount')}</span>
                  <span>{tournament.teamCount}</span>
                </div>
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-gray-600">{t('tournament.card.countries')}</span>
                  <span className="text-right">{formatTournamentCountrySelection(tournament.teamCountries)}</span>
                </div>
                {tournament.type === 'group_knockout' && tournament.groupSize && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('tournament.card.groups')}</span>
                    <span>{t('tournament.form.groupSummary', { groups: tournament.teamCount / tournament.groupSize, size: tournament.groupSize })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('tournament.createdAt')}</span>
                  <span>{new Date(tournament.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="flex-1 bg-blue-100 text-blue-700 py-2 px-3 rounded text-sm hover:bg-blue-200 flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {t('tournament.detail')}
                </Link>
                {tournament.status === 'draft' && (
                  <button
                    onClick={() => handleStartTournament(tournament.id)}
                    className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded text-sm hover:bg-green-200 flex items-center justify-center"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {t('tournament.start')}
                  </button>
                )}
                <button
                  onClick={() => handleDeleteTournament(tournament.id)}
                  className="bg-red-100 text-red-700 py-2 px-3 rounded text-sm hover:bg-red-200 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );})}

          {tournaments.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('tournament.emptyTitle')}</h3>
              <p className="text-gray-600 mb-4">{t('tournament.emptyText')}</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {t('tournament.form.create')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentManager;
