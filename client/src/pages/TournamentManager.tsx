import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Play, Plus, Trash2, Trophy } from 'lucide-react';
import { useTournaments } from '../contexts/TournamentContext';
import { tournamentAPI } from '../services/api';
import { TeamCandidate } from '../types';
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

const countryLabelMap = countryOptions.reduce<Record<string, string>>((labels, country) => {
  labels[country.value] = country.label;
  return labels;
}, {});

const formatCountrySelection = (countries?: string[]) => {
  if (!countries || countries.length === 0) return '全球不限';
  return countries.map(country => countryLabelMap[country] || country).join('、');
};

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
  const formatActiveCountrySelection = (countries?: string[]) => {
    if (!countries || countries.length === 0) return '全球不限';
    return countries.map(country => activeCountryLabelMap[country] || country).join('、');
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
      alert(err.response?.data?.error || err.message || '加载球队失败');
    } finally {
      setLoadingTeamPool(false);
    }
  };

  const handleCreateTournament = async (event: React.FormEvent) => {
    event.preventDefault();

    const selectedTeams = getSelectedTeams();
    if (selectedTeams.length !== formData.teamCount) {
      alert(`请选择 ${formData.teamCount} 支球队`);
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
      alert(err.message || '创建杯赛失败');
    }
  };

  const createWorldCup2026 = async (replacementTeam?: string) => {
    try {
      setCreatingWorldCup(true);
      await createTournament({
        name: '2026 美加墨世界杯',
        description: '按 2026 FIFA World Cup 官方分组、赛程与淘汰赛骨架创建。',
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
      alert(err.message || '创建 2026 美加墨世界杯失败');
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
    if (!window.confirm('确定删除这个杯赛吗？')) return;

    try {
      await deleteTournament(id);
    } catch (err: any) {
      alert(err.message || '删除杯赛失败');
    }
  };

  const handleStartTournament = async (id: string) => {
    try {
      await startTournament(id);
    } catch (err: any) {
      alert(err.message || '开始杯赛失败');
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
        <h1 className="text-3xl font-bold text-gray-900">杯赛管理</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          创建新杯赛
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setShowWorldCupDialog(true)} disabled={creatingWorldCup} className="flex items-center bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"><Trophy className="w-5 h-5 mr-2" />一键26美加墨</button>
      </div>

      {showWorldCupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">创建 2026 美加墨世界杯</h2>
              <button type="button" onClick={() => setShowWorldCupDialog(false)} className="text-gray-500 hover:text-gray-700">关闭</button>
            </div>
            <div className="rounded-lg border bg-emerald-50 p-4 mb-4">
              <div className="font-semibold text-gray-900">真实比赛模板</div>
              <p className="text-sm text-gray-700 mt-1">将创建 48 支国家队、12 个小组、官方小组赛时间/场馆，以及 32 强到决赛的预设骨架。</p>
              <button type="button" onClick={() => createWorldCup2026()} disabled={creatingWorldCup || luckyRolling} className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50">
                {creatingWorldCup ? '创建中...' : '确认创建原版世界杯'}
              </button>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">随机幸运儿</h3>
            <div className="border rounded-lg bg-gray-50 p-6 text-center">
              <div className={`mx-auto mb-4 min-h-[80px] flex items-center justify-center rounded border bg-white ${luckyRolling ? 'animate-pulse' : ''}`}>
                <TeamNameWithFlag team={{ name: getCountryNameZh(luckyCurrent), country: luckyCurrent, logo: null } as any} flagClassName="w-12 h-8 flex-shrink-0" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{getCountryNameZh(luckyWinner || luckyCurrent)}</div>
              <p className="mt-2 text-sm text-gray-600">最终选中的球队会被中国队替代，赛程位置保持不变。</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={startLuckyDraw} disabled={luckyRolling || creatingWorldCup} className="flex-1 bg-amber-600 text-white py-2 rounded hover:bg-amber-700 disabled:opacity-50">{luckyRolling ? '滚动中...' : '开始抽取随机幸运儿'}</button>
              <button type="button" onClick={() => luckyWinner && createWorldCup2026(luckyWinner)} disabled={!luckyWinner || luckyRolling || creatingWorldCup} className="flex-1 bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 disabled:opacity-50">创建世界杯</button>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">创建新杯赛</h2>
              <div className="text-sm text-gray-500">第 {createStep} / 2 步</div>
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
                      <div className="text-lg font-semibold text-gray-900">俱乐部杯赛</div>
                      <div className="text-sm text-gray-600 mt-1">使用各大联赛俱乐部，显示国旗和队徽。</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, teamCategory: 'national', teamCountries: [] })}
                      className={`rounded-lg border p-4 text-left transition ${formData.teamCategory === 'national' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                    >
                      <div className="text-lg font-semibold text-gray-900">国家队杯赛</div>
                      <div className="text-sm text-gray-600 mt-1">使用国家队，只显示国旗，不显示球队队徽。</div>
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">杯赛名称</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                        className="input w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">杯赛类型</label>
                      <select
                        value={formData.type}
                        onChange={(event) => setFormData({ ...formData, type: event.target.value as TournamentForm['type'] })}
                        className="input w-full"
                      >
                        <option value="knockout">淘汰赛</option>
                        <option value="league">联赛</option>
                        <option value="group_knockout">小组赛 + 淘汰赛</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                    <textarea
                      value={formData.description}
                      onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                      className="input w-full"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(event) => setFormData({ ...formData, startTime: event.target.value })}
                      className="input w-full"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">每轮比赛会从这个时间开始自动排期，同一轮比赛每场间隔 2 小时。</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">球队数量</label>
                      <select
                        value={formData.teamCount}
                        onChange={(event) => setFormData({ ...formData, teamCount: parseInt(event.target.value, 10) })}
                        className="input w-full"
                      >
                        <option value="8">8 支球队</option>
                        <option value="16">16 支球队</option>
                        <option value="32">32 支球队</option>
                        <option value="64">64 支球队</option>
                        <option value="128">128 支球队</option>
                      </select>
                    </div>

                    {formData.type === 'group_knockout' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">每组球队数</label>
                        <select
                          value={formData.groupSize}
                          onChange={(event) => setFormData({ ...formData, groupSize: parseInt(event.target.value, 10) })}
                          className="input w-full"
                        >
                          <option value="2">每组 2 队</option>
                          <option value="4">每组 4 队</option>
                          <option value="8">每组 8 队</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">将生成 {formData.teamCount / formData.groupSize} 个小组。</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">球队国家</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, teamCountries: [] })}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        全球不限
                      </button>
                    </div>

                    <div className="border rounded-lg p-3 space-y-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-2">建议方案</div>
                        <div className="flex flex-wrap gap-2">
                          {countryPresets.map(preset => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => applyCountryPreset(preset.countries)}
                              className="px-3 py-1.5 rounded border text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                            >
                              {preset.label}
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
                                  <div className="font-medium text-gray-900">{group.label}</div>
                                  <div className="text-xs text-gray-500">{selectedCount} / {groupCountries.length}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleCountryRegion(groupCountries)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  {selectedCount === groupCountries.length ? '清空本区' : '选择本区'}
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
                                    {country.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">当前：{formatActiveCountrySelection(formData.teamCountries)}</p>
                  </div>
                </>
              )}

              {createStep === 2 && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">选择球队</h3>
                      <p className="text-sm text-gray-600">
                        已选择 {selectedTeamIds.length} / {formData.teamCount} 支球队，范围：{formatActiveCountrySelection(formData.teamCountries)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => autoSelectTeams()} className="px-3 py-2 rounded bg-blue-100 text-blue-700 text-sm hover:bg-blue-200">
                        按实力自动选择
                      </button>
                      <button type="button" onClick={() => setSelectedTeamIds([])} className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
                        清空
                      </button>
                      <button type="button" onClick={() => setCreateStep(1)} className="px-3 py-2 rounded border text-gray-700 text-sm hover:bg-gray-50">
                        上一步
                      </button>
                    </div>
                  </div>
                  {!hasEnoughTeamPool && (
                    <div className="mb-3 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                      当前国家范围只找到 {teamPool.length} 支真实候选球队，不足 {formData.teamCount} 支。请返回上一步增加国家范围或减少球队数量。
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
                  {createStep === 1 ? (loadingTeamPool ? '加载球队中...' : '下一步：选择球队') : '创建杯赛'}
                </button>
                <button
                  type="button"
                  onClick={closeCreateDialog}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  取消
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
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{tournament.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{tournament.description}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${
                  tournament.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : tournament.status === 'completed'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {tournament.status === 'active' ? '进行中' : tournament.status === 'completed' ? '已完成' : '草稿'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">类型:</span>
                  <span>{tournament.type === 'knockout' ? '淘汰赛' : tournament.type === 'league' ? '联赛' : '小组赛 + 淘汰赛'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">球队数量:</span>
                  <span>{tournament.teamCount}</span>
                </div>
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-gray-600">球队国家:</span>
                  <span className="text-right">{formatCountrySelection(tournament.teamCountries)}</span>
                </div>
                {tournament.type === 'group_knockout' && tournament.groupSize && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">分组:</span>
                    <span>{tournament.teamCount / tournament.groupSize} 组，每组 {tournament.groupSize} 队</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">创建时间:</span>
                  <span>{new Date(tournament.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="flex-1 bg-blue-100 text-blue-700 py-2 px-3 rounded text-sm hover:bg-blue-200 flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  查看
                </Link>
                {tournament.status === 'draft' && (
                  <button
                    onClick={() => handleStartTournament(tournament.id)}
                    className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded text-sm hover:bg-green-200 flex items-center justify-center"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    开始
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
          ))}

          {tournaments.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无杯赛</h3>
              <p className="text-gray-600 mb-4">开始创建你的第一个杯赛。</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                创建杯赛
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentManager;
