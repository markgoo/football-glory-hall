import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Play, Search, Star, Trophy, Users } from 'lucide-react';
import { matchAPI, tournamentAPI } from '../services/api';
import { Match, Team, Tournament } from '../types';
import { TeamFlag, TeamLogo, TeamNameWithFlag } from '../utils/flags';

type TournamentDetailData = Tournament & { matches?: Match[] };
type MatchStatusFilter = 'all' | 'scheduled' | 'completed';
type MatchSortMode = 'round-asc' | 'round-desc' | 'team-asc';
type ManualHalfKey = 'firstHalf' | 'secondHalf';
type ManualSideKey = 'home' | 'away';
type ManualRoll = { candidates: number[]; pool: number[]; die?: number; goals?: number; activeIndex?: number; rolling?: boolean; rollClicks?: number };
type ManualGame = Record<ManualHalfKey, { home?: ManualRoll; away?: ManualRoll }>;
type ManualRollSession = { targetDie: number; clicks: number; currentTick: number; landingAt?: number };
type BracketColumn = { title: string; matches: Match[] };
type ChampionInfo = { name: string; source: 'official' | 'final' };
type GroupStanding = {
  team: Team;
  played: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

const KNOCKOUT_GROUP_NAME = '淘汰赛';
const UNGROUPED_NAME = '未分组';
const emptyManualGame = (): ManualGame => ({ firstHalf: {}, secondHalf: {} });

const groupByName = <T extends { groupName?: string }>(items: T[]) => {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const name = item.groupName || UNGROUPED_NAME;
    groups[name] = groups[name] || [];
    groups[name].push(item);
    return groups;
  }, {});
};

const matchContainsTeam = (match: Match, teamId: string) => match.homeTeam?.id === teamId || match.awayTeam?.id === teamId;
const getTeamOverall = (match: Match, side: 'home' | 'away') => (side === 'home' ? match.homeTeam?.stats?.overall : match.awayTeam?.stats?.overall) || 80;
const getManualRollModifier = (match: Match, side: 'home' | 'away') => {
  const own = getTeamOverall(match, side);
  const opponent = getTeamOverall(match, side === 'home' ? 'away' : 'home');
  const modifier = Math.max(-2, Math.min(2, Math.round((own - opponent) / 8)));
  return side === 'home' ? modifier + 1 : modifier;
};
const weightedGoalCandidate = (modifier: number) => {
  const roll = Math.random();
  const boost = modifier * 0.025;
  if (roll < 0.46 - boost) return 0;
  if (roll < 0.78 - boost) return 1;
  if (roll < 0.93) return 2;
  if (roll < 0.985) return 3;
  return 4;
};
const createManualRoll = (match: Match, side: 'home' | 'away'): ManualRoll => {
  const modifier = getManualRollModifier(match, side);
  const pool = Array.from({ length: 100 }, () => weightedGoalCandidate(modifier));
  const candidates = Array.from({ length: 6 }, () => 0);
  return { candidates, pool };
};
const drawManualCandidates = (roll: ManualRoll) => Array.from({ length: 6 }, () => roll.pool[Math.floor(Math.random() * roll.pool.length)]).sort((a, b) => a - b);
const hasPenaltyResult = (match: Match) => typeof match.homePenaltyScore === 'number' && typeof match.awayPenaltyScore === 'number';
const createManualGame = (match: Match): ManualGame => {
  return {
    firstHalf: {
      home: createManualRoll(match, 'home'),
      away: createManualRoll(match, 'away')
    },
    secondHalf: {
      home: createManualRoll(match, 'home'),
      away: createManualRoll(match, 'away')
    }
  };
};

const getGroupOrder = (name: string) => {
  const letter = name.match(/^([A-Z])组$/);
  if (letter) return letter[1].charCodeAt(0) - 65;
  const numeric = name.match(/^第(\d+)组$/);
  if (numeric) return Number(numeric[1]) - 1;
  const stageOrder: Record<string, number> = {
    '六十四分之一决赛': 9872,
    '三十二分之一决赛': 9936,
    '十六分之一决赛': 9968,
    '八分之一决赛': 9984,
    '四分之一决赛': 9992,
    '半决赛': 9996,
    '三四名决赛': 9999,
    '决赛': 10000,
    [KNOCKOUT_GROUP_NAME]: 10001
  };
  return stageOrder[name] ?? Number.MAX_SAFE_INTEGER;
};
const compareGroupNames = (a: string, b: string) => getGroupOrder(a) - getGroupOrder(b) || a.localeCompare(b);
const compareMatchStageNames = (a: string, b: string) => getGroupOrder(b) - getGroupOrder(a) || b.localeCompare(a);
const getKnockoutStageLabel = (count: number) => {
  const entrants = count * 2;
  if (entrants === 128) return '六十四分之一决赛';
  if (entrants === 64) return '三十二分之一决赛';
  if (entrants === 32) return '十六分之一决赛';
  if (entrants === 16) return '八分之一决赛';
  if (entrants === 8) return '四分之一决赛';
  if (entrants === 4) return '半决赛';
  if (entrants === 2) return '决赛';
  return count > 0 ? `${entrants}进${count}` : KNOCKOUT_GROUP_NAME;
};
const buildMatchStageLookup = (matches: Match[]) => {
  const counts = matches.reduce<Record<number, number>>((acc, match) => {
    if (!match.groupName && match.stage !== 'third_place') acc[match.round] = (acc[match.round] || 0) + 1;
    return acc;
  }, {});
  return matches.reduce<Record<string, string>>((lookup, match) => {
    lookup[match.id] = match.groupName || (match.stage === 'third_place' ? '三四名决赛' : getKnockoutStageLabel(counts[match.round] || 0));
    return lookup;
  }, {});
};
const getMatchStageName = (match: Match, lookup: Record<string, string>) => lookup[match.id] || match.groupName || KNOCKOUT_GROUP_NAME;
const groupMatchesByStage = (matches: Match[], lookup: Record<string, string>) => {
  return matches.reduce<Record<string, Match[]>>((groups, match) => {
    const name = getMatchStageName(match, lookup);
    groups[name] = groups[name] || [];
    groups[name].push(match);
    return groups;
  }, {});
};
const compareMatches = (a: Match, b: Match, mode: MatchSortMode, lookup: Record<string, string>) => {
  if (mode === 'round-desc') return b.round - a.round || compareMatchStageNames(getMatchStageName(a, lookup), getMatchStageName(b, lookup));
  if (mode === 'team-asc') return (a.homeTeam?.name || '').localeCompare(b.homeTeam?.name || '') || (a.awayTeam?.name || '').localeCompare(b.awayTeam?.name || '');
  return compareMatchStageNames(getMatchStageName(a, lookup), getMatchStageName(b, lookup)) || a.round - b.round;
};

const calculateGroupStandings = (teams: Team[], matches: Match[]) => {
  const standings = teams.reduce<Record<string, GroupStanding[]>>((groups, team) => {
    const groupName = team.groupName || UNGROUPED_NAME;
    groups[groupName] = groups[groupName] || [];
    groups[groupName].push({ team, played: 0, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 });
    return groups;
  }, {});
  const getStanding = (team: Team) => standings[team.groupName || UNGROUPED_NAME]?.find(item => item.team.id === team.id);
  matches.filter(match => match.groupName && match.status === 'completed').forEach(match => {
    const home = getStanding(match.homeTeam);
    const away = getStanding(match.awayTeam);
    if (!home || !away) return;
    const hs = match.homeScore ?? 0;
    const as = match.awayScore ?? 0;
    home.played += 1; away.played += 1;
    home.goalsFor += hs; home.goalsAgainst += as;
    away.goalsFor += as; away.goalsAgainst += hs;
    if (hs > as) { home.wins += 1; home.points += 3; away.losses += 1; }
    else if (as > hs) { away.wins += 1; away.points += 3; home.losses += 1; }
    else { home.draws += 1; away.draws += 1; home.points += 1; away.points += 1; }
  });
  Object.values(standings).forEach(group => {
    group.forEach(row => { row.goalDifference = row.goalsFor - row.goalsAgainst; });
    group.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || b.wins - a.wins || a.team.name.localeCompare(b.team.name));
  });
  return standings;
};

const splitGroupEntries = (groupedTeams: Record<string, Team[]>) => {
  const entries = Object.entries(groupedTeams).sort(([a], [b]) => compareGroupNames(a, b));
  const midpoint = Math.ceil(entries.length / 2);
  return { left: entries.slice(0, midpoint), right: entries.slice(midpoint) };
};

const buildBracketColumns = (matches: Match[], lookup: Record<string, string>) => {
  const knockoutMatches = matches
    .filter(match => !match.groupName && match.stage !== 'third_place')
    .sort((a, b) => a.round - b.round || a.id.localeCompare(b.id));
  const byRound = knockoutMatches.reduce<Record<number, Match[]>>((rounds, match) => {
    rounds[match.round] = rounds[match.round] || [];
    rounds[match.round].push(match);
    return rounds;
  }, {});
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
  const finalRound = rounds.find(round => byRound[round].length === 1) ?? rounds[rounds.length - 1];
  const finalMatch = finalRound !== undefined ? byRound[finalRound]?.[0] : undefined;
  const sideRounds = rounds.filter(round => round !== finalRound);
  const left: BracketColumn[] = [];
  const right: BracketColumn[] = [];
  sideRounds.forEach(round => {
    const roundMatches = byRound[round];
    const midpoint = Math.ceil(roundMatches.length / 2);
    const title = getMatchStageName(roundMatches[0], lookup);
    left.push({ title, matches: roundMatches.slice(0, midpoint) });
    right.unshift({ title, matches: roundMatches.slice(midpoint) });
  });
  return { left, right, finalMatch };
};

const getMatchScoreText = (match: Match) => {
  if (match.status !== 'completed') return '待进行';
  const penalties = hasPenaltyResult(match) ? ` 点球 ${match.homePenaltyScore}-${match.awayPenaltyScore}` : '';
  return `${match.homeScore ?? 0}-${match.awayScore ?? 0}${penalties}`;
};

const getMatchWinner = (match?: Match) => {
  if (!match || match.status !== 'completed') return undefined;
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  if (homeScore > awayScore) return match.homeTeam;
  if (awayScore > homeScore) return match.awayTeam;
  if (hasPenaltyResult(match)) return (match.homePenaltyScore ?? 0) > (match.awayPenaltyScore ?? 0) ? match.homeTeam : match.awayTeam;
  return undefined;
};

const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<TournamentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingMatch, setStartingMatch] = useState<string | null>(null);
  const [startingAll, setStartingAll] = useState(false);
  const [manualMatch, setManualMatch] = useState<Match | null>(null);
  const [manualGame, setManualGame] = useState<ManualGame>(emptyManualGame());
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualAutoSubmit, setManualAutoSubmit] = useState(false);
  const [manualRollAllUsed, setManualRollAllUsed] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);
  const manualRollTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const manualRollSessions = useRef<Record<string, ManualRollSession>>({});
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [roundFilter, setRoundFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');
  const [sortMode, setSortMode] = useState<MatchSortMode>('round-asc');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>([]);
  const favoriteStorageKey = id ? `football-glory-hall:favorites:${id}` : '';
  const clearManualRollTimer = (half: ManualHalfKey, side: 'home' | 'away') => {
    const key = `${half}:${side}`;
    if (manualRollTimers.current[key]) {
      clearTimeout(manualRollTimers.current[key]);
      delete manualRollTimers.current[key];
    }
  };
  const getManualRollKey = (half: ManualHalfKey, side: ManualSideKey) => `${half}:${side}`;
  const clearAllManualRollTimers = () => {
    Object.values(manualRollTimers.current).forEach(timer => clearTimeout(timer));
    manualRollTimers.current = {};
    manualRollSessions.current = {};
  };

  const fetchTournament = async () => {
    if (!id) return;
    try {
      const response = await tournamentAPI.getById(id);
      setTournament(response.data as TournamentDetailData);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchTournament(); }, [id]);
  useEffect(() => () => clearAllManualRollTimers(), []);
  useEffect(() => {
    if (!favoriteStorageKey) return;
    const saved = localStorage.getItem(favoriteStorageKey);
    if (saved) setFavoriteTeamIds(JSON.parse(saved));
  }, [favoriteStorageKey]);

  const isGroupTournament = tournament?.type === 'group_knockout';
  const matches = tournament?.matches || [];
  const teams = tournament?.teams || [];
  const groupedTeams = useMemo(() => groupByName<Team>(teams), [teams]);
  const groupStandings = useMemo(() => calculateGroupStandings(teams, matches), [teams, matches]);
  const stageLookup = useMemo(() => buildMatchStageLookup(matches), [matches]);
  const bracketColumns = useMemo(() => buildBracketColumns(matches, stageLookup), [matches, stageLookup]);
  const championInfo = useMemo<ChampionInfo | undefined>(() => {
    if (tournament?.winner) return { name: tournament.winner, source: 'official' };
    const finalWinner = getMatchWinner(bracketColumns.finalMatch);
    return finalWinner ? { name: finalWinner.name, source: 'final' } : undefined;
  }, [bracketColumns.finalMatch, tournament?.winner]);
  const groupOptions = useMemo(() => Object.keys(groupMatchesByStage(matches, stageLookup)).sort(compareMatchStageNames), [matches, stageLookup]);
  const roundOptions = useMemo(() => Array.from(new Set(matches.map(match => match.round))).sort((a, b) => a - b), [matches]);
  const completedMatchesCount = useMemo(() => matches.filter(match => match.status === 'completed').length, [matches]);
  const favoriteTeams = useMemo(() => teams.filter(team => favoriteTeamIds.includes(team.id)), [teams, favoriteTeamIds]);

  const filteredMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return matches
      .filter(match => groupFilter === 'all' || getMatchStageName(match, stageLookup) === groupFilter)
      .filter(match => roundFilter === 'all' || match.round === Number(roundFilter))
      .filter(match => statusFilter === 'all' || match.status === statusFilter)
      .filter(match => !normalized || `${match.homeTeam?.name || ''} ${match.awayTeam?.name || ''}`.toLowerCase().includes(normalized))
      .filter(match => !onlyFavorites || favoriteTeamIds.some(teamId => matchContainsTeam(match, teamId)))
      .sort((a, b) => compareMatches(a, b, sortMode, stageLookup));
  }, [favoriteTeamIds, groupFilter, matches, onlyFavorites, query, roundFilter, sortMode, stageLookup, statusFilter]);
  const filteredGroupedMatches = useMemo(() => groupMatchesByStage(filteredMatches, stageLookup), [filteredMatches, stageLookup]);

  const toggleFavoriteTeam = (teamId: string) => {
    const next = favoriteTeamIds.includes(teamId) ? favoriteTeamIds.filter(id => id !== teamId) : [...favoriteTeamIds, teamId];
    setFavoriteTeamIds(next);
    if (favoriteStorageKey) localStorage.setItem(favoriteStorageKey, JSON.stringify(next));
  };
  const handleStartMatch = async (matchId: string) => {
    setStartingMatch(matchId);
    try { await matchAPI.simulate(matchId); await fetchTournament(); }
    catch (error: any) { alert(error.response?.data?.error || error.message || '开始比赛失败'); }
    finally { setStartingMatch(null); }
  };
  const handleStartAllMatches = async () => {
    setStartingAll(true);
    try {
      for (const match of filteredMatches.filter(match => match.status === 'scheduled')) await matchAPI.simulate(match.id);
      await fetchTournament();
    } finally { setStartingAll(false); }
  };
  const openManualMatch = (match: Match) => {
    setManualMatch(match);
    setManualGame(createManualGame(match));
    setManualAutoSubmit(false);
    setManualRollAllUsed(false);
    setManualSaved(false);
  };
  const updateManualRoll = (half: ManualHalfKey, side: ManualSideKey, updater: (roll: ManualRoll) => ManualRoll) => {
    if (!manualMatch) return;
    setManualGame(current => {
      const currentRoll = current[half][side] || createManualRoll(manualMatch, side);
      return { ...current, [half]: { ...current[half], [side]: updater(currentRoll) } };
    });
  };
  const finishManualRollAnimation = (half: ManualHalfKey, side: ManualSideKey, die: number, clicks: number) => {
    updateManualRoll(half, side, roll => {
      const candidates = drawManualCandidates(roll);
      return { ...roll, candidates, die, goals: candidates[die - 1], activeIndex: die - 1, rolling: false, rollClicks: clicks };
    });
    clearManualRollTimer(half, side);
    delete manualRollSessions.current[getManualRollKey(half, side)];
  };
  const animateManualRoll = (half: ManualHalfKey, side: ManualSideKey, tick = 0) => {
    const key = getManualRollKey(half, side);
    const session = manualRollSessions.current[key];
    if (!session) return;
    session.currentTick = tick;
    const totalTicks = session.landingAt ?? 16 + session.clicks * 12;
    const nextIndex = tick >= totalTicks ? session.targetDie - 1 : tick % 6;
    updateManualRoll(half, side, roll => ({
      ...roll,
      candidates: tick >= totalTicks ? roll.candidates : drawManualCandidates(roll),
      activeIndex: nextIndex,
      rolling: tick < totalTicks,
      rollClicks: session.clicks
    }));
    if (tick >= totalTicks) {
      finishManualRollAnimation(half, side, session.targetDie, session.clicks);
      return;
    }
    const progress = tick / totalTicks;
    const interval = Math.round(Math.max(26, 68 - session.clicks * 14) + progress * progress * 190);
    manualRollTimers.current[key] = setTimeout(() => animateManualRoll(half, side, tick + 1), interval);
  };
  const rollManualSide = (half: ManualHalfKey, side: ManualSideKey) => {
    if (!manualMatch) return;
    const currentRoll = manualGame[half][side] || createManualRoll(manualMatch, side);
    const key = getManualRollKey(half, side);
    const existing = manualRollSessions.current[key];
    const nextClicks = existing ? Math.min(3, existing.clicks + 1) : currentRoll.rolling ? Math.min(3, (currentRoll.rollClicks || 1) + 1) : 1;
    manualRollSessions.current[key] = {
      targetDie: Math.floor(Math.random() * 6) + 1,
      clicks: nextClicks,
      currentTick: existing?.currentTick ?? 0
    };
    clearManualRollTimer(half, side);
    updateManualRoll(half, side, roll => ({ ...roll, die: undefined, goals: undefined, rolling: true, rollClicks: nextClicks, activeIndex: roll.activeIndex ?? 0 }));
    animateManualRoll(half, side, existing?.currentTick ?? 0);
  };
  const rollAllManualSides = () => {
    if (manualRollAllUsed) return;
    setManualRollAllUsed(true);
    setManualAutoSubmit(true);
    const targets = (['firstHalf', 'secondHalf'] as ManualHalfKey[]).flatMap(half => (['home', 'away'] as ManualSideKey[]).map(side => ({ half, side })));
    targets.forEach(({ half, side }) => rollManualSide(half, side));
  };
  const requestManualLanding = () => {
    Object.entries(manualRollSessions.current).forEach(([key, session]) => {
      if (!session.landingAt) session.landingAt = session.currentTick + 8;
      const [half, side] = key.split(':') as [ManualHalfKey, ManualSideKey];
      clearManualRollTimer(half, side);
      animateManualRoll(half, side, session.currentTick);
    });
  };
  const manualRollingCount = useMemo(() => {
    return (['firstHalf', 'secondHalf'] as ManualHalfKey[]).reduce((count, half) => {
      return count + (['home', 'away'] as ManualSideKey[]).filter(side => manualGame[half][side]?.rolling).length;
    }, 0);
  }, [manualGame]);
  const manualAnyRollStarted = useMemo(() => {
    return (['firstHalf', 'secondHalf'] as ManualHalfKey[]).some(half => {
      return (['home', 'away'] as ManualSideKey[]).some(side => Boolean(manualGame[half][side]?.rolling || manualGame[half][side]?.die));
    });
  }, [manualGame]);
  const getManualScore = (side: 'home' | 'away') => (manualGame.firstHalf[side]?.goals ?? 0) + (manualGame.secondHalf[side]?.goals ?? 0);
  const manualGameComplete = Boolean(
    manualGame.firstHalf.home?.goals !== undefined &&
    manualGame.firstHalf.away?.goals !== undefined &&
    manualGame.secondHalf.home?.goals !== undefined &&
    manualGame.secondHalf.away?.goals !== undefined
  );
  const submitManualMatch = async () => {
    if (!manualMatch || !manualGameComplete) return;
    setSubmittingManual(true);
    try {
      await matchAPI.manual(manualMatch.id, {
        homeScore: getManualScore('home'),
        awayScore: getManualScore('away'),
        manualDetails: {
          method: 'six_candidate_goals_by_half',
          distribution: '候选进球数按权重生成：0约46%，1约32%，2约15%，3约5.5%，4约1.5%；骰子1-6选择对应位置。',
          halves: manualGame
        }
      });
      clearAllManualRollTimers();
      setManualAutoSubmit(false);
      setManualRollAllUsed(false);
      setManualSaved(true);
      await fetchTournament();
    } finally { setSubmittingManual(false); }
  };
  useEffect(() => {
    if (!manualAutoSubmit || !manualGameComplete || manualRollingCount > 0 || submittingManual) return;
    submitManualMatch();
  }, [manualAutoSubmit, manualGameComplete, manualRollingCount, submittingManual]);
  const handleJumpToResults = () => {
    setGroupFilter('all');
    setRoundFilter('all');
    setStatusFilter(completedMatchesCount > 0 ? 'completed' : 'all');
    setQuery('');
    setOnlyFavorites(false);
    window.setTimeout(() => document.getElementById('match-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (!tournament) return <div className="text-center py-12">杯赛未找到</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <Link to="/tournaments" className="flex items-center text-blue-600 hover:text-blue-800 mb-4"><ArrowLeft className="w-4 h-4 mr-2" />返回杯赛列表</Link>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4 gap-4">
          <div><h1 className="text-3xl font-bold text-gray-900 mb-2">{tournament.name}</h1><p className="text-gray-600">{tournament.description}</p></div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {matches.length > 0 && <button type="button" onClick={handleJumpToResults} className="inline-flex items-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"><Trophy className="w-4 h-4 mr-2" />比赛结果{completedMatchesCount > 0 ? ` (${completedMatchesCount})` : ''}</button>}
            <span className={`px-3 py-1 text-sm rounded-full ${tournament.status === 'active' ? 'bg-green-100 text-green-800' : tournament.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>{tournament.status === 'active' ? '进行中' : tournament.status === 'completed' ? '已完成' : '草稿'}</span>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <InfoCard icon={<Users className="w-5 h-5 text-blue-600" />} label="球队数量" value={String(tournament.teamCount)} />
          <InfoCard icon={<Calendar className="w-5 h-5 text-green-600" />} label="创建时间" value={new Date(tournament.createdAt).toLocaleDateString()} />
          <InfoCard icon={<Trophy className="w-5 h-5 text-purple-600" />} label="杯赛类型" value={tournament.type === 'knockout' ? '淘汰赛' : tournament.type === 'league' ? '联赛' : '小组赛 + 淘汰赛'} detail={isGroupTournament && tournament.groupSize ? `${tournament.teamCount / tournament.groupSize} 组，每组 ${tournament.groupSize} 队` : undefined} />
        </div>
        {teams.length > 0 && <TournamentBracket groupedTeams={groupedTeams} standings={groupStandings} columns={bracketColumns} champion={championInfo} />}
        {teams.length > 0 && (
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">参赛球队</h3>
            {isGroupTournament ? <div className="grid lg:grid-cols-2 gap-4">{Object.entries(groupedTeams).sort(([a], [b]) => compareGroupNames(a, b)).map(([name, groupTeams]) => <TeamGroup key={name} groupName={name} teams={groupTeams} favoriteTeamIds={favoriteTeamIds} onToggleFavorite={toggleFavoriteTeam} />)}</div> : <div className="grid md:grid-cols-2 gap-4">{teams.map(team => <TeamCard key={team.id} team={team} isFavorite={favoriteTeamIds.includes(team.id)} onToggleFavorite={toggleFavoriteTeam} />)}</div>}
          </section>
        )}
        {isGroupTournament && Object.keys(groupStandings).length > 0 && <Standings standings={groupStandings} />}
        {matches.length > 0 && (
          <section id="match-results" className="mt-8 scroll-mt-4">
            <div className="flex justify-between items-center mb-4">
              <div><h3 className="text-xl font-semibold text-gray-900">比赛安排</h3><p className="text-sm text-gray-600 mt-1">当前显示 {filteredMatches.length} / {matches.length} 场比赛{favoriteTeams.length > 0 && `，关注 ${favoriteTeams.map(team => team.name).join('、')}`}</p></div>
              {filteredMatches.some(match => match.status === 'scheduled') && <button onClick={handleStartAllMatches} disabled={startingAll} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center"><Play className="w-4 h-4 mr-2" />{startingAll ? '正在开始...' : '开始当前筛选比赛'}</button>}
            </div>
            <MatchToolbar query={query} onQueryChange={setQuery} groupFilter={groupFilter} onGroupFilterChange={setGroupFilter} groupOptions={groupOptions} roundFilter={roundFilter} onRoundFilterChange={setRoundFilter} roundOptions={roundOptions} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} sortMode={sortMode} onSortModeChange={setSortMode} onlyFavorites={onlyFavorites} onOnlyFavoritesChange={setOnlyFavorites} hasFavorites={favoriteTeamIds.length > 0} />
            {isGroupTournament ? <div className="space-y-6">{Object.entries(filteredGroupedMatches).sort(([a], [b]) => compareMatchStageNames(a, b)).map(([name, groupMatches]) => <div key={name}><h4 className="font-semibold text-gray-900 mb-3">{name}</h4><div className="space-y-3">{groupMatches.map(match => <MatchRow key={match.id} match={match} favoriteTeamIds={favoriteTeamIds} startingMatch={startingMatch} onStart={handleStartMatch} onManualStart={openManualMatch} />)}</div></div>)}</div> : <div className="space-y-4">{filteredMatches.map(match => <MatchRow key={match.id} match={match} favoriteTeamIds={favoriteTeamIds} startingMatch={startingMatch} onStart={handleStartMatch} onManualStart={openManualMatch} />)}</div>}
            {filteredMatches.length === 0 && <div className="border rounded-lg p-8 text-center text-gray-500">没有符合当前筛选条件的比赛。</div>}
          </section>
        )}
      </div>
      {manualMatch && <ManualMatchModal match={manualMatch} game={manualGame} submitting={submittingManual} complete={manualGameComplete} rollingCount={manualRollingCount} rollAllUsed={manualRollAllUsed} anyRollStarted={manualAnyRollStarted} autoSubmit={manualAutoSubmit} saved={manualSaved} onClose={() => { clearAllManualRollTimers(); setManualAutoSubmit(false); setManualRollAllUsed(false); setManualSaved(false); setManualMatch(null); }} onRoll={rollManualSide} onRollAll={rollAllManualSides} onRequestLanding={requestManualLanding} onSubmit={submitManualMatch} getScore={getManualScore} />}
    </div>
  );
};

const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value: string; detail?: string }> = ({ icon, label, value, detail }) => <div className="bg-gray-50 p-4 rounded-lg"><div className="flex items-center gap-2">{icon}<span className="text-sm text-gray-600">{label}</span></div><p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>{detail && <p className="text-sm text-gray-600 mt-1">{detail}</p>}</div>;

const TournamentBracket: React.FC<{ groupedTeams: Record<string, Team[]>; standings: Record<string, GroupStanding[]>; columns: { left: BracketColumn[]; right: BracketColumn[]; finalMatch?: Match }; champion?: ChampionInfo }> = ({ groupedTeams, standings, columns, champion }) => {
  const { left, right } = splitGroupEntries(groupedTeams);
  return (
    <section className="mb-8">
      <div className={`mb-4 rounded-lg border p-4 ${champion ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="text-sm font-medium text-gray-600">冠军</div>
        <div className={`mt-1 text-2xl font-bold ${champion ? 'text-amber-800' : 'text-gray-500'}`}>{champion?.name || '待定'}</div>
      </div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-xl font-semibold text-gray-900">杯赛晋级图</h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-gray-500">左侧小组向右晋级，右侧小组向左晋级，中心为决赛</span>
        </div>
      </div>
      <div className="border rounded-lg bg-slate-50 overflow-x-auto">
        <div className="min-w-[980px] p-4 grid gap-3 items-stretch" style={{ gridTemplateColumns: `180px repeat(${columns.left.length}, minmax(150px, 1fr)) minmax(170px, 1.1fr) repeat(${columns.right.length}, minmax(150px, 1fr)) 180px` }}>
          <BracketGroups title="左侧小组" entries={left} standings={standings} />
          {columns.left.map((column, index) => <BracketMatchColumn key={`left-${column.title}-${index}`} column={column} />)}
          <div className="flex flex-col justify-center">
            <div className="text-center text-sm font-semibold text-gray-700 mb-2">决赛</div>
            {columns.finalMatch ? <BracketMatchCard match={columns.finalMatch} prominent /> : <div className="border border-dashed rounded bg-white p-4 text-center text-sm text-gray-500">决赛待生成</div>}
          </div>
          {columns.right.map((column, index) => <BracketMatchColumn key={`right-${column.title}-${index}`} column={column} />)}
          <BracketGroups title="右侧小组" entries={right} standings={standings} />
        </div>
      </div>
    </section>
  );
};

const BracketGroups: React.FC<{ title: string; entries: Array<[string, Team[]]>; standings: Record<string, GroupStanding[]> }> = ({ title, entries, standings }) => (
  <div>
    <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>
    <div className="space-y-2">
      {entries.map(([name, teams]) => (
        <div key={name} className="bg-white border rounded p-2">
          <div className="text-sm font-semibold text-gray-900 mb-1">{name}</div>
          <div className="space-y-1">
            {teams.slice(0, 4).map(team => {
              const standingIndex = standings[name]?.findIndex(row => row.team.id === team.id) ?? -1;
              const qualified = standingIndex >= 0 && standingIndex < 2;
              return <div key={team.id} className={`text-xs px-1 py-0.5 rounded flex items-center gap-1 min-w-0 ${qualified ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-700'}`}><TeamFlag team={team} className="w-4 h-3 flex-shrink-0" /><TeamLogo team={team} className="w-4 h-4 flex-shrink-0" /><span className="truncate">{team.name}</span>{qualified && <span className="ml-1 text-[10px] flex-shrink-0">晋级</span>}</div>;
            })}
          </div>
        </div>
      ))}
      {entries.length === 0 && <div className="border border-dashed rounded bg-white p-3 text-sm text-gray-500">暂无小组</div>}
    </div>
  </div>
);

const BracketMatchColumn: React.FC<{ column: BracketColumn }> = ({ column }) => (
  <div className="flex flex-col justify-center">
    <div className="text-center text-sm font-semibold text-gray-700 mb-2">{column.title}</div>
    <div className="space-y-2">
      {column.matches.map(match => <BracketMatchCard key={match.id} match={match} />)}
    </div>
  </div>
);

const BracketMatchCard: React.FC<{ match: Match; prominent?: boolean }> = ({ match, prominent = false }) => (
  <div className={`bg-white border rounded p-2 ${prominent ? 'border-amber-400 bg-amber-50' : ''}`}>
    <div className="flex items-center justify-between gap-2 text-xs">
      <TeamNameWithFlag team={match.homeTeam} className="font-medium text-gray-900" flagClassName="w-4 h-3 flex-shrink-0" />
      <span className="text-gray-900 font-bold">{match.status === 'completed' ? match.homeScore ?? 0 : '-'}</span>
    </div>
    <div className="flex items-center justify-between gap-2 text-xs mt-1">
      <TeamNameWithFlag team={match.awayTeam} className="font-medium text-gray-900" flagClassName="w-4 h-3 flex-shrink-0" />
      <span className="text-gray-900 font-bold">{match.status === 'completed' ? match.awayScore ?? 0 : '-'}</span>
    </div>
    <div className="mt-1 text-[10px] text-gray-500 truncate">{getMatchScoreText(match)}</div>
  </div>
);

const TeamGroup: React.FC<{ groupName: string; teams: Team[]; favoriteTeamIds: string[]; onToggleFavorite: (teamId: string) => void }> = ({ groupName, teams, favoriteTeamIds, onToggleFavorite }) => <div className="border rounded-lg p-4"><h4 className="font-semibold text-gray-900 mb-3">{groupName}</h4><div className="space-y-2">{teams.map(team => <TeamCard key={team.id} team={team} isFavorite={favoriteTeamIds.includes(team.id)} onToggleFavorite={onToggleFavorite} compact />)}</div></div>;
const TeamCard: React.FC<{ team: Team; isFavorite: boolean; compact?: boolean; onToggleFavorite: (teamId: string) => void }> = ({ team, isFavorite, compact = false, onToggleFavorite }) => <div className={`border rounded-lg ${compact ? 'px-3 py-2' : 'p-4'} flex items-center justify-between`}><div className="min-w-0"><h4 className="font-semibold text-gray-900 flex items-center gap-2 min-w-0"><TeamFlag team={team} className="w-5 h-4 flex-shrink-0" /><TeamLogo team={team} className="w-5 h-5 flex-shrink-0" /><span className="truncate">{team.name}</span></h4><p className="text-sm text-gray-600">{team.shortName}{team.country ? ` · ${team.country}` : ''}</p></div><button onClick={() => onToggleFavorite(team.id)} className={`p-2 rounded hover:bg-yellow-50 ${isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}><Star className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} /></button></div>;

const Standings: React.FC<{ standings: Record<string, GroupStanding[]> }> = ({ standings }) => (
  <section className="mt-8"><h3 className="text-xl font-semibold text-gray-900 mb-4">小组积分榜</h3><div className="grid xl:grid-cols-2 gap-4">{Object.entries(standings).sort(([a], [b]) => compareGroupNames(a, b)).map(([name, rows]) => <div key={name} className="border rounded-lg overflow-hidden"><div className="bg-gray-50 px-4 py-3 font-semibold text-gray-900">{name}</div><table className="min-w-full text-sm"><thead className="bg-white border-b"><tr className="text-gray-500"><th className="px-3 py-2 text-left">排名</th><th className="px-3 py-2 text-left">球队</th><th className="px-3 py-2 text-center">赛</th><th className="px-3 py-2 text-center">胜</th><th className="px-3 py-2 text-center">平</th><th className="px-3 py-2 text-center">负</th><th className="px-3 py-2 text-center">进</th><th className="px-3 py-2 text-center">失</th><th className="px-3 py-2 text-center">净</th><th className="px-3 py-2 text-center">分</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.team.id} className={index < 2 ? 'bg-green-50' : ''}><td className="px-3 py-2">{index + 1}</td><td className="px-3 py-2 font-medium text-gray-900"><span className="inline-flex items-center gap-2 min-w-0"><TeamFlag team={row.team} className="w-5 h-4 flex-shrink-0" /><TeamLogo team={row.team} className="w-5 h-5 flex-shrink-0" /><span>{row.team.name}</span>{index < 2 && <span className="ml-1 text-xs text-green-700">晋级</span>}</span></td><td className="px-3 py-2 text-center">{row.played}</td><td className="px-3 py-2 text-center">{row.wins}</td><td className="px-3 py-2 text-center">{row.draws}</td><td className="px-3 py-2 text-center">{row.losses}</td><td className="px-3 py-2 text-center">{row.goalsFor}</td><td className="px-3 py-2 text-center">{row.goalsAgainst}</td><td className="px-3 py-2 text-center">{row.goalDifference}</td><td className="px-3 py-2 text-center font-semibold">{row.points}</td></tr>)}</tbody></table></div>)}</div></section>
);

const MatchToolbar: React.FC<{ query: string; onQueryChange: (value: string) => void; groupFilter: string; onGroupFilterChange: (value: string) => void; groupOptions: string[]; roundFilter: string; onRoundFilterChange: (value: string) => void; roundOptions: number[]; statusFilter: MatchStatusFilter; onStatusFilterChange: (value: MatchStatusFilter) => void; sortMode: MatchSortMode; onSortModeChange: (value: MatchSortMode) => void; onlyFavorites: boolean; onOnlyFavoritesChange: (value: boolean) => void; hasFavorites: boolean }> = ({ query, onQueryChange, groupFilter, onGroupFilterChange, groupOptions, roundFilter, onRoundFilterChange, roundOptions, statusFilter, onStatusFilterChange, sortMode, onSortModeChange, onlyFavorites, onOnlyFavoritesChange, hasFavorites }) => (
  <div className="bg-gray-50 border rounded-lg p-4 mb-4"><div className="grid md:grid-cols-6 gap-3"><div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} className="input pl-9" placeholder="搜索球队" /></div><select value={groupFilter} onChange={(event) => onGroupFilterChange(event.target.value)} className="input"><option value="all">全部阶段</option>{groupOptions.map(name => <option key={name} value={name}>{name}</option>)}</select><select value={roundFilter} onChange={(event) => onRoundFilterChange(event.target.value)} className="input"><option value="all">全部轮次</option>{roundOptions.map(round => <option key={round} value={round}>第 {round} 轮</option>)}</select><select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as MatchStatusFilter)} className="input"><option value="all">全部状态</option><option value="scheduled">待进行</option><option value="completed">已结束</option></select><select value={sortMode} onChange={(event) => onSortModeChange(event.target.value as MatchSortMode)} className="input"><option value="round-asc">阶段优先</option><option value="round-desc">轮次降序</option><option value="team-asc">主队名称</option></select></div><label className={`mt-3 inline-flex items-center gap-2 text-sm ${hasFavorites ? 'text-gray-700' : 'text-gray-400'}`}><input type="checkbox" checked={onlyFavorites} disabled={!hasFavorites} onChange={(event) => onOnlyFavoritesChange(event.target.checked)} />只看关注球队的比赛</label></div>
);

const MatchRow: React.FC<{ match: Match; favoriteTeamIds: string[]; startingMatch: string | null; onStart: (matchId: string) => void; onManualStart: (match: Match) => void }> = ({ match, favoriteTeamIds, startingMatch, onStart, onManualStart }) => {
  const homeFavorite = match.homeTeam && favoriteTeamIds.includes(match.homeTeam.id);
  const awayFavorite = match.awayTeam && favoriteTeamIds.includes(match.awayTeam.id);
  return <div className="border rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex-1 min-w-0"><h4 className="font-semibold mb-1 flex flex-wrap items-center gap-2 min-w-0"><TeamNameWithFlag team={match.homeTeam} className={`${homeFavorite ? 'text-yellow-700' : 'text-gray-900'} max-w-full sm:max-w-[45%]`} flagClassName="w-5 h-4 flex-shrink-0" /><span className="text-gray-400 flex-shrink-0">vs</span><TeamNameWithFlag team={match.awayTeam} className={`${awayFavorite ? 'text-yellow-700' : 'text-gray-900'} max-w-full sm:max-w-[45%]`} flagClassName="w-5 h-4 flex-shrink-0" /></h4><p className="text-sm text-gray-600">第 {match.round} 轮 - {match.status === 'scheduled' ? '待进行' : match.status === 'in_progress' ? '进行中' : '已结束'}{match.resultMode === 'manual' && <span className="ml-2 text-blue-700">手工计算</span>}</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">{match.status !== 'scheduled' && <span className="font-bold text-xl sm:text-right">{match.homeScore ?? 0} - {match.awayScore ?? 0}{hasPenaltyResult(match) && <span className="ml-2 text-sm text-gray-600">点球 {match.homePenaltyScore} - {match.awayPenaltyScore}</span>}</span>}<div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{match.status === 'scheduled' && <><button onClick={() => onStart(match.id)} disabled={startingMatch === match.id} className="inline-flex flex-1 justify-center whitespace-nowrap bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 sm:flex-none">{startingMatch === match.id ? '开始中...' : '自动进行'}</button><button onClick={() => onManualStart(match)} className="inline-flex flex-1 justify-center whitespace-nowrap bg-amber-600 text-white px-3 py-1 rounded text-sm hover:bg-amber-700 sm:flex-none">手动进行</button></>}<Link to={`/matches/${match.id}`} className="inline-flex flex-1 justify-center whitespace-nowrap bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 sm:flex-none">{match.status === 'scheduled' ? '查看详情' : '查看统计'}</Link></div></div></div>;
};

const ManualMatchModal: React.FC<{
  match: Match;
  game: ManualGame;
  submitting: boolean;
  complete: boolean;
  rollingCount: number;
  rollAllUsed: boolean;
  anyRollStarted: boolean;
  autoSubmit: boolean;
  saved: boolean;
  onClose: () => void;
  onRoll: (half: ManualHalfKey, side: ManualSideKey) => void;
  onRollAll: () => void;
  onRequestLanding: () => void;
  onSubmit: () => void;
  getScore: (side: 'home' | 'away') => number;
}> = ({ match, game, submitting, complete, rollingCount, rollAllUsed, anyRollStarted, autoSubmit, saved, onClose, onRoll, onRollAll, onRequestLanding, onSubmit, getScore }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">手动进行比赛</h2>
          <p className="text-sm text-gray-600 flex items-center gap-2"><TeamNameWithFlag team={match.homeTeam} flagClassName="w-4 h-3 flex-shrink-0" /><span>vs</span><TeamNameWithFlag team={match.awayTeam} flagClassName="w-4 h-3 flex-shrink-0" /></p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">关闭</button>
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-sm text-blue-900 mb-4">
        每队每半场有 100 个按低比分权重生成的候选池。投掷时 6 个候选数字会持续随机滚动，骰子位置也会滚动，最后骰子点数 1-6 选中对应位置作为本半场进球数。
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={onRollAll}
          disabled={submitting || saved || rollAllUsed || anyRollStarted}
          className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {autoSubmit ? '自动保存中...' : rollAllUsed ? '已一键投掷' : '一键投掷并保存'}
        </button>
        <button
          type="button"
          onClick={onRequestLanding}
          disabled={submitting || saved || rollingCount === 0}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          立即落子
        </button>
        <span className="text-sm text-gray-600">{saved ? '结果已保存，可关闭窗口查看比赛列表' : autoSubmit ? '四个结果全部落下后会自动保存' : rollingCount > 0 ? `${rollingCount} 个投掷正在滚动` : '可单独投掷后手动保存，也可一次性投掷并保存'}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {(['firstHalf', 'secondHalf'] as ManualHalfKey[]).map(half => (
          <div key={half} className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">{half === 'firstHalf' ? '上半场' : '下半场'}</h3>
            {(['home', 'away'] as Array<'home' | 'away'>).map(side => {
              const roll = game[half][side];
              const team = side === 'home' ? match.homeTeam : match.awayTeam;
              return (
                <div key={side} className="mb-3 last:mb-0 border rounded p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <div className="font-medium text-gray-900"><TeamNameWithFlag team={team} flagClassName="w-4 h-3 flex-shrink-0" /></div>
                      <div className="text-xs text-gray-500">候选进球数</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRoll(half, side)}
                      disabled={submitting || saved || Boolean(roll?.rolling && (roll.rollClicks || 1) >= 3)}
                      className="bg-amber-600 text-white px-3 py-1 rounded text-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {roll?.rolling ? ((roll.rollClicks || 1) >= 3 ? '落子中...' : `加速 ${roll.rollClicks || 1}/3`) : '掷骰'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(roll?.candidates || []).map((value, index) => {
                      const selected = roll?.die === index + 1;
                      const active = roll?.activeIndex === index;
                      const rolling = Boolean(roll?.rolling);
                      const slotValues = rolling ? [roll?.pool[(index * 7 + value + 3) % (roll.pool.length || 1)] ?? value, value, roll?.pool[(index * 11 + value + 9) % (roll.pool.length || 1)] ?? value] : [value];
                      return (
                        <span key={index} className={`inline-flex flex-col items-center justify-center w-10 h-10 border rounded font-semibold transition-all duration-100 ${selected ? 'bg-amber-100 border-amber-500 text-amber-800 scale-105 shadow-sm' : active ? 'bg-blue-100 border-blue-500 text-blue-800 scale-105' : 'bg-white text-gray-900'} ${rolling ? 'shadow-inner' : ''}`}>
                          <span className="text-[10px] leading-none">{index + 1}</span>
                          <span className="slot-number-window">
                            <span className={`slot-number-strip ${rolling ? 'is-rolling' : ''}`}>
                              {slotValues.map((slotValue, slotIndex) => <span key={slotIndex}>{slotValue}</span>)}
                            </span>
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-sm text-gray-700">
                    {roll?.rolling ? `滚动中，可再点 ${Math.max(0, 3 - (roll.rollClicks || 1))} 次加速` : roll?.die ? `骰子 ${roll.die}，本半场进球：${roll.goals}` : '等待掷骰选择位置'}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="text-lg font-bold text-gray-900 flex flex-wrap items-center gap-2">当前比分：<TeamNameWithFlag team={match.homeTeam} flagClassName="w-5 h-4 flex-shrink-0" /> {getScore('home')} - {getScore('away')} <TeamNameWithFlag team={match.awayTeam} flagClassName="w-5 h-4 flex-shrink-0" /></div>
        <button type="button" disabled={(!complete || submitting || autoSubmit) && !saved} onClick={saved ? onClose : onSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {saved ? '关闭' : submitting ? '保存中...' : autoSubmit ? '等待自动保存' : '保存手工结果'}
        </button>
      </div>
    </div>
  </div>
);

export default TournamentDetail;
