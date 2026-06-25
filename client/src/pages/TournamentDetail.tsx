import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronDown, Play, Search, Star, Trophy, Users } from 'lucide-react';
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
type PenaltyKick = { side: ManualSideKey; shooter?: number; keeper?: number; goal?: boolean };
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
const getPenaltyScore = (kicks: PenaltyKick[], side: ManualSideKey) => kicks.filter(kick => kick.side === side && kick.goal).length;
const getPenaltyComplete = (kicks: PenaltyKick[]) => {
  const completed = kicks.filter(kick => kick.shooter !== undefined && kick.keeper !== undefined);
  const homeTaken = completed.filter(kick => kick.side === 'home').length;
  const awayTaken = completed.filter(kick => kick.side === 'away').length;
  if (homeTaken < 5 || awayTaken < 5 || homeTaken !== awayTaken) return false;
  return getPenaltyScore(completed, 'home') !== getPenaltyScore(completed, 'away');
};

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
const compareMatchStageNames = (a: string, b: string) => getGroupOrder(a) - getGroupOrder(b) || a.localeCompare(b);
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
const groupMatchesByRoundAndStage = (matches: Match[], lookup: Record<string, string>) => {
  return matches.reduce<Record<number, Record<string, Match[]>>>((rounds, match) => {
    rounds[match.round] = rounds[match.round] || {};
    const stageName = getMatchStageName(match, lookup);
    rounds[match.round][stageName] = rounds[match.round][stageName] || [];
    rounds[match.round][stageName].push(match);
    return rounds;
  }, {});
};
const compareMatches = (a: Match, b: Match, mode: MatchSortMode, lookup: Record<string, string>) => {
  if (mode === 'round-desc') return b.round - a.round || compareMatchStageNames(getMatchStageName(a, lookup), getMatchStageName(b, lookup));
  if (mode === 'team-asc') return (a.homeTeam?.name || '').localeCompare(b.homeTeam?.name || '') || (a.awayTeam?.name || '').localeCompare(b.awayTeam?.name || '');
  return a.round - b.round || compareMatchStageNames(getMatchStageName(a, lookup), getMatchStageName(b, lookup));
};
const formatMatchTime = (value?: string) => value ? new Date(value).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '时间待定';
const getMatchSideFallback = (match: Match, side: 'home' | 'away') => side === 'home' ? match.homeSlot || '待定' : match.awaySlot || '待定';
const isScheduleVisibleMatch = (match: Match) => !!match.groupName || match.status === 'completed' || (!!match.homeTeam && !!match.awayTeam);

const calculateGroupStandings = (teams: Team[], matches: Match[]) => {
  const standings = teams.reduce<Record<string, GroupStanding[]>>((groups, team) => {
    const groupName = team.groupName || UNGROUPED_NAME;
    groups[groupName] = groups[groupName] || [];
    groups[groupName].push({ team, played: 0, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 });
    return groups;
  }, {});
  const getStanding = (team: Team) => standings[team.groupName || UNGROUPED_NAME]?.find(item => item.team.id === team.id);
  matches.filter(match => match.groupName && match.status === 'completed').forEach(match => {
    if (!match.homeTeam || !match.awayTeam) return;
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

const getCompletedGroupNames = (matches: Match[]) => {
  const counts = matches.filter(match => match.groupName).reduce<Record<string, { total: number; completed: number }>>((groups, match) => {
    const groupName = match.groupName as string;
    groups[groupName] = groups[groupName] || { total: 0, completed: 0 };
    groups[groupName].total += 1;
    if (match.status === 'completed') groups[groupName].completed += 1;
    return groups;
  }, {});
  return new Set(Object.entries(counts).filter(([, count]) => count.total > 0 && count.completed === count.total).map(([groupName]) => groupName));
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

const getChampionInfo = (tournament?: TournamentDetailData | null, finalMatch?: Match): ChampionInfo | undefined => {
  const finalWinner = getMatchWinner(finalMatch);
  if (finalWinner) return { name: finalWinner.name, source: 'final' };
  if (finalMatch) return undefined;
  if (tournament?.status === 'completed' && tournament.winner) return { name: tournament.winner, source: 'official' };
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
  const [penaltyKicks, setPenaltyKicks] = useState<PenaltyKick[]>([]);
  const [penaltyDiceOpen, setPenaltyDiceOpen] = useState(false);
  const manualRollTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const manualRollSessions = useRef<Record<string, ManualRollSession>>({});
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [roundFilter, setRoundFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');
  const [sortMode, setSortMode] = useState<MatchSortMode>('round-asc');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>([]);
  const [bracketOpen, setBracketOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [standingsOpen, setStandingsOpen] = useState(false);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
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
  const completedGroupNames = useMemo(() => getCompletedGroupNames(matches), [matches]);
  const stageLookup = useMemo(() => buildMatchStageLookup(matches), [matches]);
  const bracketColumns = useMemo(() => buildBracketColumns(matches, stageLookup), [matches, stageLookup]);
  const championInfo = useMemo(() => getChampionInfo(tournament, bracketColumns.finalMatch), [bracketColumns.finalMatch, tournament]);
  const scheduleMatches = useMemo(() => matches.filter(isScheduleVisibleMatch), [matches]);
  const groupOptions = useMemo(() => Object.keys(groupMatchesByStage(scheduleMatches, stageLookup)).sort(compareMatchStageNames), [scheduleMatches, stageLookup]);
  const roundOptions = useMemo(() => Array.from(new Set(scheduleMatches.map(match => match.round))).sort((a, b) => a - b), [scheduleMatches]);
  const completedMatchesCount = useMemo(() => matches.filter(match => match.status === 'completed').length, [matches]);
  const nextScheduledMatch = useMemo(() => scheduleMatches.find(match => match.status === 'scheduled'), [scheduleMatches]);
  const favoriteTeams = useMemo(() => teams.filter(team => favoriteTeamIds.includes(team.id)), [teams, favoriteTeamIds]);

  const filteredMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return scheduleMatches
      .filter(match => groupFilter === 'all' || getMatchStageName(match, stageLookup) === groupFilter)
      .filter(match => roundFilter === 'all' || match.round === Number(roundFilter))
      .filter(match => statusFilter === 'all' || match.status === statusFilter)
      .filter(match => !normalized || `${match.homeTeam?.name || ''} ${match.awayTeam?.name || ''}`.toLowerCase().includes(normalized))
      .filter(match => !onlyFavorites || favoriteTeamIds.some(teamId => matchContainsTeam(match, teamId)))
      .sort((a, b) => compareMatches(a, b, sortMode, stageLookup));
  }, [favoriteTeamIds, groupFilter, onlyFavorites, query, roundFilter, scheduleMatches, sortMode, stageLookup, statusFilter]);
  const filteredMatchesByRound = useMemo(() => groupMatchesByRoundAndStage(filteredMatches, stageLookup), [filteredMatches, stageLookup]);

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
      for (const match of filteredMatches.filter(match => match.status === 'scheduled' && match.homeTeam && match.awayTeam)) await matchAPI.simulate(match.id);
      await fetchTournament();
    } finally { setStartingAll(false); }
  };
  const openManualMatch = (match: Match) => {
    setManualMatch(match);
    setManualGame(createManualGame(match));
    setManualAutoSubmit(false);
    setManualRollAllUsed(false);
    setManualSaved(false);
    setPenaltyKicks([]);
    setPenaltyDiceOpen(false);
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
  const manualNeedsPenalty = Boolean(manualMatch && manualGameComplete && !manualMatch.groupName && getManualScore('home') === getManualScore('away'));
  const penaltyComplete = useMemo(() => getPenaltyComplete(penaltyKicks), [penaltyKicks]);
  const manualReadyToSave = manualGameComplete && (!manualNeedsPenalty || penaltyComplete);
  const rollPenaltyShotDie = () => Math.floor(Math.random() * 7);
  const rollPenaltySaveDie = () => Math.floor(Math.random() * 6) + 1;
  const rollPenalty = (forcedDie?: number) => {
    if (submittingManual || manualSaved || !manualNeedsPenalty || penaltyComplete) return;
    setPenaltyKicks(current => {
      const last = current[current.length - 1];
      if (!last || (last.shooter !== undefined && last.keeper !== undefined)) {
        const nextDie = typeof forcedDie === 'number' ? forcedDie : rollPenaltyShotDie();
        return [...current, { side: current.length % 2 === 0 ? 'home' : 'away', shooter: nextDie }];
      }
      if (last.shooter === undefined) {
        const nextDie = typeof forcedDie === 'number' ? forcedDie : rollPenaltyShotDie();
        return current.map((kick, index) => index === current.length - 1 ? { ...kick, shooter: nextDie } : kick);
      }
      if (last.keeper === undefined) {
        const keeper = typeof forcedDie === 'number' ? forcedDie : rollPenaltySaveDie();
        return current.map((kick, index) => index === current.length - 1 ? { ...kick, keeper, goal: (kick.shooter ?? 0) > 0 && (kick.shooter ?? 0) >= keeper } : kick);
      }
      return current;
    });
  };
  const openPenaltyDice = () => {
    if (submittingManual || manualSaved || !manualNeedsPenalty || penaltyComplete) return;
    setPenaltyDiceOpen(true);
  };
  const completeManualPenaltyKick = (shooter: number, keeper: number) => {
    if (submittingManual || manualSaved || !manualNeedsPenalty || penaltyComplete) return;
    setPenaltyKicks(current => {
      const last = current[current.length - 1];
      const side: ManualSideKey = !last || (last.shooter !== undefined && last.keeper !== undefined) ? (current.length % 2 === 0 ? 'home' : 'away') : last.side;
      const completedKick = { side, shooter, keeper, goal: shooter > 0 && shooter >= keeper };
      if (!last || (last.shooter !== undefined && last.keeper !== undefined)) return [...current, completedKick];
      return current.map((kick, index) => index === current.length - 1 ? completedKick : kick);
    });
  };
  const submitManualMatch = async () => {
    if (!manualMatch || !manualReadyToSave) return;
    setSubmittingManual(true);
    try {
      await matchAPI.manual(manualMatch.id, {
        homeScore: getManualScore('home'),
        awayScore: getManualScore('away'),
        homePenaltyScore: manualNeedsPenalty ? getPenaltyScore(penaltyKicks, 'home') : undefined,
        awayPenaltyScore: manualNeedsPenalty ? getPenaltyScore(penaltyKicks, 'away') : undefined,
        manualDetails: {
          method: 'six_candidate_goals_by_half',
          distribution: '候选进球数按权重生成：0约46%，1约32%，2约15%，3约5.5%，4约1.5%；骰子1-6选择对应位置。',
          halves: manualGame,
          penalties: manualNeedsPenalty ? penaltyKicks : undefined
        }
      });
      clearAllManualRollTimers();
      setManualAutoSubmit(false);
      setManualRollAllUsed(false);
      setManualSaved(true);
      setPenaltyKicks([]);
      setPenaltyDiceOpen(false);
      if (manualNeedsPenalty) setManualMatch(null);
      await fetchTournament();
    } finally { setSubmittingManual(false); }
  };
  useEffect(() => {
    if (!manualAutoSubmit || manualNeedsPenalty || !manualReadyToSave || manualRollingCount > 0 || submittingManual) return;
    submitManualMatch();
  }, [manualAutoSubmit, manualNeedsPenalty, manualReadyToSave, manualRollingCount, submittingManual]);
  const handleJumpToResults = () => {
    setGroupFilter('all');
    setRoundFilter('all');
    setStatusFilter(completedMatchesCount > 0 ? 'completed' : 'all');
    setQuery('');
    setOnlyFavorites(false);
    window.setTimeout(() => document.getElementById('match-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const handleJumpToNextScheduledMatch = () => {
    if (!nextScheduledMatch) return;
    setGroupFilter('all');
    setRoundFilter('all');
    setStatusFilter('all');
    setQuery('');
    setOnlyFavorites(false);
    setCollapsedRounds(current => {
      const next = new Set(current);
      next.delete(nextScheduledMatch.round);
      return next;
    });
    window.setTimeout(() => document.getElementById(`match-${nextScheduledMatch.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  };
  const scrollToPageTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToPageBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  const toggleRoundCollapsed = (round: number) => {
    setCollapsedRounds(current => {
      const next = new Set(current);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
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
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <InfoCard icon={<Users className="w-5 h-5 text-blue-600" />} label="球队数量" value={String(tournament.teamCount)} />
          <InfoCard icon={<Users className="w-5 h-5 text-indigo-600" />} label="参赛对象" value={tournament.teamCategory === 'national' ? '国家队' : '俱乐部'} />
          <InfoCard icon={<Calendar className="w-5 h-5 text-green-600" />} label="开始时间" value={tournament.startTime ? new Date(tournament.startTime).toLocaleString() : new Date(tournament.createdAt).toLocaleDateString()} />
          <InfoCard icon={<Trophy className="w-5 h-5 text-purple-600" />} label="杯赛类型" value={tournament.type === 'knockout' ? '淘汰赛' : tournament.type === 'league' ? '联赛' : '小组赛 + 淘汰赛'} detail={isGroupTournament && tournament.groupSize ? `${tournament.teamCount / tournament.groupSize} 组，每组 ${tournament.groupSize} 队` : undefined} />
        </div>
        {teams.length > 0 && (
          <CollapsibleSection title="杯赛晋级图" open={bracketOpen} onToggle={() => setBracketOpen(open => !open)}>
            <TournamentBracket groupedTeams={groupedTeams} standings={groupStandings} completedGroupNames={completedGroupNames} columns={bracketColumns} champion={championInfo} />
          </CollapsibleSection>
        )}
        {teams.length > 0 && (
          <CollapsibleSection title="参赛球队" open={teamsOpen} onToggle={() => setTeamsOpen(open => !open)}>
            {isGroupTournament ? <div className="grid lg:grid-cols-2 gap-4">{Object.entries(groupedTeams).sort(([a], [b]) => compareGroupNames(a, b)).map(([name, groupTeams]) => <TeamGroup key={name} groupName={name} teams={groupTeams} favoriteTeamIds={favoriteTeamIds} onToggleFavorite={toggleFavoriteTeam} />)}</div> : <div className="grid md:grid-cols-2 gap-4">{teams.map(team => <TeamCard key={team.id} team={team} isFavorite={favoriteTeamIds.includes(team.id)} onToggleFavorite={toggleFavoriteTeam} />)}</div>}
          </CollapsibleSection>
        )}
        {isGroupTournament && Object.keys(groupStandings).length > 0 && (
          <CollapsibleSection title="小组积分榜" open={standingsOpen} onToggle={() => setStandingsOpen(open => !open)}>
            <Standings standings={groupStandings} completedGroupNames={completedGroupNames} />
          </CollapsibleSection>
        )}
        {matches.length > 0 && (
          <section id="match-results" className="mt-8 scroll-mt-4">
            <div className="flex justify-between items-center mb-4">
              <div><h3 className="text-xl font-semibold text-gray-900">比赛安排</h3><p className="text-sm text-gray-600 mt-1">当前显示 {filteredMatches.length} / {scheduleMatches.length} 场比赛{favoriteTeams.length > 0 && `，关注 ${favoriteTeams.map(team => team.name).join('、')}`}</p></div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {nextScheduledMatch && <button onClick={handleJumpToNextScheduledMatch} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"><Play className="w-4 h-4 mr-2" />下一场比赛</button>}
                {filteredMatches.some(match => match.status === 'scheduled' && match.homeTeam && match.awayTeam) && <button onClick={handleStartAllMatches} disabled={startingAll} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center"><Play className="w-4 h-4 mr-2" />{startingAll ? '正在开始...' : '开始当前筛选比赛'}</button>}
              </div>
            </div>
            <MatchToolbar query={query} onQueryChange={setQuery} groupFilter={groupFilter} onGroupFilterChange={setGroupFilter} groupOptions={groupOptions} roundFilter={roundFilter} onRoundFilterChange={setRoundFilter} roundOptions={roundOptions} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} sortMode={sortMode} onSortModeChange={setSortMode} onlyFavorites={onlyFavorites} onOnlyFavoritesChange={setOnlyFavorites} hasFavorites={favoriteTeamIds.length > 0} />
            <div className="space-y-6">
              {Object.entries(filteredMatchesByRound).sort(([a], [b]) => sortMode === 'round-desc' ? Number(b) - Number(a) : Number(a) - Number(b)).map(([round, stageGroups]) => {
                const roundNumber = Number(round);
                const roundMatches = Object.values(stageGroups).flat();
                const completedRoundMatches = roundMatches.filter(match => match.status === 'completed').length;
                const collapsed = collapsedRounds.has(roundNumber);
                const roundStatus = completedRoundMatches === roundMatches.length ? 'completed' : completedRoundMatches > 0 ? 'partial' : 'pending';
                const roundStatusClass = roundStatus === 'completed' ? 'bg-green-100 text-green-800' : roundStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700';
                const roundStatusText = roundStatus === 'completed' ? '全部完成' : roundStatus === 'partial' ? '有未完成' : '未开始';
                return (
                  <div key={round} className="border rounded-lg bg-gray-50 overflow-hidden">
                    <button type="button" onClick={() => toggleRoundCollapsed(roundNumber)} className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-100">
                      <h4 className="font-semibold text-gray-900">第 {round} 轮</h4>
                      <span className="flex items-center gap-3 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${roundStatusClass}`}>{roundStatusText}</span>
                        <span>{completedRoundMatches}/{roundMatches.length} 已完成</span>
                        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
                      </span>
                    </button>
                    {!collapsed && (
                      <div className="space-y-4 p-4 pt-1">
                        {Object.entries(stageGroups).sort(([a], [b]) => compareMatchStageNames(a, b)).map(([name, groupMatches]) => (
                          <div key={`${round}-${name}`}>
                            <div className="text-sm font-medium text-gray-700 mb-2">{name}</div>
                            <div className="space-y-3">
                          {groupMatches.map(match => <MatchRow key={match.id} match={match} favoriteTeamIds={favoriteTeamIds} startingMatch={startingMatch} onStart={handleStartMatch} onManualStart={openManualMatch} />)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {filteredMatches.length === 0 && <div className="border rounded-lg p-8 text-center text-gray-500">没有符合当前筛选条件的比赛。</div>}
          </section>
        )}
      </div>
      {manualMatch && <ManualMatchModal match={manualMatch} game={manualGame} submitting={submittingManual} complete={manualReadyToSave} normalComplete={manualGameComplete} needsPenalty={manualNeedsPenalty} penaltyComplete={penaltyComplete} penaltyKicks={penaltyKicks} penaltyDiceOpen={penaltyDiceOpen} rollingCount={manualRollingCount} rollAllUsed={manualRollAllUsed} anyRollStarted={manualAnyRollStarted} autoSubmit={manualAutoSubmit} saved={manualSaved} onClose={() => { clearAllManualRollTimers(); setManualAutoSubmit(false); setManualRollAllUsed(false); setManualSaved(false); setPenaltyKicks([]); setPenaltyDiceOpen(false); setManualMatch(null); }} onRoll={rollManualSide} onRollAll={rollAllManualSides} onRequestLanding={requestManualLanding} onPenaltyRoll={rollPenalty} onPenaltyManualRoll={openPenaltyDice} onPenaltyDiceClose={() => setPenaltyDiceOpen(false)} onPenaltyDiceComplete={(shooter, keeper) => { completeManualPenaltyKick(shooter, keeper); setPenaltyDiceOpen(false); }} onSubmit={submitManualMatch} getScore={getManualScore} />}
      <FloatingScrollToolbar onTop={scrollToPageTop} onBottom={scrollToPageBottom} onNextMatch={handleJumpToNextScheduledMatch} hasNextMatch={Boolean(nextScheduledMatch)} />
    </div>
  );
};

const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value: string; detail?: string }> = ({ icon, label, value, detail }) => <div className="bg-gray-50 p-4 rounded-lg"><div className="flex items-center gap-2">{icon}<span className="text-sm text-gray-600">{label}</span></div><p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>{detail && <p className="text-sm text-gray-600 mt-1">{detail}</p>}</div>;

const FloatingScrollToolbar: React.FC<{ onTop: () => void; onBottom: () => void; onNextMatch: () => void; hasNextMatch: boolean }> = ({ onTop, onBottom, onNextMatch, hasNextMatch }) => (
  <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2">
    <button type="button" onClick={onTop} className="rounded bg-gray-900 px-3 py-2 text-sm text-white shadow-lg hover:bg-gray-800">顶部</button>
    <button type="button" onClick={onBottom} className="rounded bg-gray-900 px-3 py-2 text-sm text-white shadow-lg hover:bg-gray-800">底部</button>
    {hasNextMatch && <button type="button" onClick={onNextMatch} className="rounded bg-blue-600 px-3 py-2 text-sm text-white shadow-lg hover:bg-blue-700">下一场</button>}
  </div>
);

const CollapsibleSection: React.FC<{ title: string; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, open, onToggle, children }) => (
  <section className="mb-4 border rounded-lg">
    <button type="button" onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="px-4 pb-4">{children}</div>}
  </section>
);

const TournamentBracket: React.FC<{ groupedTeams: Record<string, Team[]>; standings: Record<string, GroupStanding[]>; completedGroupNames: Set<string>; columns: { left: BracketColumn[]; right: BracketColumn[]; finalMatch?: Match }; champion?: ChampionInfo }> = ({ groupedTeams, standings, completedGroupNames, columns, champion }) => {
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
          <BracketGroups title="左侧小组" entries={left} standings={standings} completedGroupNames={completedGroupNames} />
          {columns.left.map((column, index) => <BracketMatchColumn key={`left-${column.title}-${index}`} column={column} />)}
          <div className="flex flex-col justify-center">
            <div className="text-center text-sm font-semibold text-gray-700 mb-2">决赛</div>
            {columns.finalMatch ? <BracketMatchCard match={columns.finalMatch} prominent /> : <div className="border border-dashed rounded bg-white p-4 text-center text-sm text-gray-500">决赛待生成</div>}
          </div>
          {columns.right.map((column, index) => <BracketMatchColumn key={`right-${column.title}-${index}`} column={column} />)}
          <BracketGroups title="右侧小组" entries={right} standings={standings} completedGroupNames={completedGroupNames} />
        </div>
      </div>
    </section>
  );
};

const BracketGroups: React.FC<{ title: string; entries: Array<[string, Team[]]>; standings: Record<string, GroupStanding[]>; completedGroupNames: Set<string> }> = ({ title, entries, standings, completedGroupNames }) => (
  <div>
    <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>
    <div className="space-y-2">
      {entries.map(([name, teams]) => (
        <div key={name} className="bg-white border rounded p-2">
          <div className="text-sm font-semibold text-gray-900 mb-1">{name}</div>
          <div className="space-y-1">
            {teams.slice(0, 4).map(team => {
              const standingIndex = standings[name]?.findIndex(row => row.team.id === team.id) ?? -1;
              const qualified = completedGroupNames.has(name) && standingIndex >= 0 && standingIndex < 2;
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

const Standings: React.FC<{ standings: Record<string, GroupStanding[]>; completedGroupNames: Set<string> }> = ({ standings, completedGroupNames }) => (
  <section className="mt-8">
    <h3 className="text-xl font-semibold text-gray-900 mb-4">小组积分榜</h3>
    <div className="grid xl:grid-cols-2 gap-4">
      {Object.entries(standings).sort(([a], [b]) => compareGroupNames(a, b)).map(([name, rows]) => {
        const groupCompleted = completedGroupNames.has(name);
        return (
          <div key={name} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-900">{name}</div>
            <table className="min-w-full text-sm">
              <thead className="bg-white border-b">
                <tr className="text-gray-500">
                  <th className="px-3 py-2 text-left">排名</th>
                  <th className="px-3 py-2 text-left">球队</th>
                  <th className="px-3 py-2 text-center">赛</th>
                  <th className="px-3 py-2 text-center">胜</th>
                  <th className="px-3 py-2 text-center">平</th>
                  <th className="px-3 py-2 text-center">负</th>
                  <th className="px-3 py-2 text-center">进</th>
                  <th className="px-3 py-2 text-center">失</th>
                  <th className="px-3 py-2 text-center">净</th>
                  <th className="px-3 py-2 text-center">分</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const qualified = groupCompleted && index < 2;
                  return (
                    <tr key={row.team.id} className={qualified ? 'bg-green-50' : ''}>
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <TeamFlag team={row.team} className="w-5 h-4 flex-shrink-0" />
                          <TeamLogo team={row.team} className="w-5 h-5 flex-shrink-0" />
                          <span>{row.team.name}</span>
                          {qualified && <span className="ml-1 text-xs text-green-700">晋级</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">{row.played}</td>
                      <td className="px-3 py-2 text-center">{row.wins}</td>
                      <td className="px-3 py-2 text-center">{row.draws}</td>
                      <td className="px-3 py-2 text-center">{row.losses}</td>
                      <td className="px-3 py-2 text-center">{row.goalsFor}</td>
                      <td className="px-3 py-2 text-center">{row.goalsAgainst}</td>
                      <td className="px-3 py-2 text-center">{row.goalDifference}</td>
                      <td className="px-3 py-2 text-center font-semibold">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  </section>
);

const MatchToolbar: React.FC<{ query: string; onQueryChange: (value: string) => void; groupFilter: string; onGroupFilterChange: (value: string) => void; groupOptions: string[]; roundFilter: string; onRoundFilterChange: (value: string) => void; roundOptions: number[]; statusFilter: MatchStatusFilter; onStatusFilterChange: (value: MatchStatusFilter) => void; sortMode: MatchSortMode; onSortModeChange: (value: MatchSortMode) => void; onlyFavorites: boolean; onOnlyFavoritesChange: (value: boolean) => void; hasFavorites: boolean }> = ({ query, onQueryChange, groupFilter, onGroupFilterChange, groupOptions, roundFilter, onRoundFilterChange, roundOptions, statusFilter, onStatusFilterChange, sortMode, onSortModeChange, onlyFavorites, onOnlyFavoritesChange, hasFavorites }) => (
  <div className="bg-gray-50 border rounded-lg p-4 mb-4"><div className="grid md:grid-cols-6 gap-3"><div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} className="input pl-9" placeholder="搜索球队" /></div><select value={groupFilter} onChange={(event) => onGroupFilterChange(event.target.value)} className="input"><option value="all">全部阶段</option>{groupOptions.map(name => <option key={name} value={name}>{name}</option>)}</select><select value={roundFilter} onChange={(event) => onRoundFilterChange(event.target.value)} className="input"><option value="all">全部轮次</option>{roundOptions.map(round => <option key={round} value={round}>第 {round} 轮</option>)}</select><select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as MatchStatusFilter)} className="input"><option value="all">全部状态</option><option value="scheduled">待进行</option><option value="completed">已结束</option></select><select value={sortMode} onChange={(event) => onSortModeChange(event.target.value as MatchSortMode)} className="input"><option value="round-asc">轮次优先</option><option value="round-desc">轮次降序</option><option value="team-asc">主队名称</option></select></div><label className={`mt-3 inline-flex items-center gap-2 text-sm ${hasFavorites ? 'text-gray-700' : 'text-gray-400'}`}><input type="checkbox" checked={onlyFavorites} disabled={!hasFavorites} onChange={(event) => onOnlyFavoritesChange(event.target.checked)} />只看关注球队的比赛</label></div>
);

const MatchRow: React.FC<{ match: Match; favoriteTeamIds: string[]; startingMatch: string | null; onStart: (matchId: string) => void; onManualStart: (match: Match) => void }> = ({ match, favoriteTeamIds, startingMatch, onStart, onManualStart }) => {
  const homeFavorite = match.homeTeam && favoriteTeamIds.includes(match.homeTeam.id);
  const awayFavorite = match.awayTeam && favoriteTeamIds.includes(match.awayTeam.id);
  return <div id={`match-${match.id}`} className="scroll-mt-6 border rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white"><div className="flex-1 min-w-0"><h4 className="font-semibold mb-1 flex flex-wrap items-center gap-2 min-w-0"><TeamNameWithFlag team={match.homeTeam} fallback={getMatchSideFallback(match, 'home')} className={`${homeFavorite ? 'text-yellow-700' : 'text-gray-900'} max-w-full sm:max-w-[45%]`} flagClassName="w-5 h-4 flex-shrink-0" /><span className="text-gray-400 flex-shrink-0">vs</span><TeamNameWithFlag team={match.awayTeam} fallback={getMatchSideFallback(match, 'away')} className={`${awayFavorite ? 'text-yellow-700' : 'text-gray-900'} max-w-full sm:max-w-[45%]`} flagClassName="w-5 h-4 flex-shrink-0" /></h4><p className="text-sm text-gray-600">第 {match.round} 轮 - {match.bracketStage || getMatchStageName(match, {})} - {match.status === 'scheduled' ? '待进行' : match.status === 'in_progress' ? '进行中' : '已结束'}{match.resultMode === 'manual' && <span className="ml-2 text-blue-700">上帝摇骰子</span>}</p><p className="text-xs text-gray-500 mt-1">{formatMatchTime(match.scheduledAt)}{match.venue ? ` · ${match.venue}` : ''}</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">{match.status !== 'scheduled' && <span className="font-bold text-xl sm:text-right">{match.homeScore ?? 0} - {match.awayScore ?? 0}{hasPenaltyResult(match) && <span className="ml-2 text-sm text-gray-600">点球 {match.homePenaltyScore} - {match.awayPenaltyScore}</span>}</span>}<div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{match.status === 'scheduled' && match.homeTeam && match.awayTeam && <><button onClick={() => onStart(match.id)} disabled={startingMatch === match.id} className="inline-flex flex-1 justify-center whitespace-nowrap bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 sm:flex-none">{startingMatch === match.id ? '开始中...' : '自动进行'}</button><button onClick={() => onManualStart(match)} className="inline-flex flex-1 justify-center whitespace-nowrap bg-amber-600 text-white px-3 py-1 rounded text-sm hover:bg-amber-700 sm:flex-none">掷骰子</button></>}<Link to={`/matches/${match.id}`} className="inline-flex flex-1 justify-center whitespace-nowrap bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 sm:flex-none">{match.status === 'scheduled' ? '查看详情' : '查看统计'}</Link></div></div></div>;
};

const PenaltyShootoutPanel: React.FC<{ match: Match; kicks: PenaltyKick[]; complete: boolean; submitting: boolean; saved: boolean; onRoll: () => void; onManualRoll: () => void }> = ({ match, kicks, complete, submitting, saved, onRoll, onManualRoll }) => {
  const homeScore = getPenaltyScore(kicks, 'home');
  const awayScore = getPenaltyScore(kicks, 'away');
  const last = kicks[kicks.length - 1];
  const nextSide: ManualSideKey = !last || (last.shooter !== undefined && last.keeper !== undefined) ? (kicks.length % 2 === 0 ? 'home' : 'away') : last.side;
  const shooterTeam = nextSide === 'home' ? match.homeTeam : match.awayTeam;
  const keeperTeam = nextSide === 'home' ? match.awayTeam : match.homeTeam;
  const currentRound = complete ? Math.max(1, Math.ceil(kicks.length / 2)) : last && last.keeper === undefined ? Math.floor((kicks.length - 1) / 2) + 1 : Math.floor(kicks.length / 2) + 1;
  const tiedAfterFive = kicks.length >= 10 && kicks.length % 2 === 0 && homeScore === awayScore && !complete;
  const roundCount = Math.max(5, Math.ceil((kicks.length + (tiedAfterFive ? 1 : 0)) / 2), currentRound);
  const message = complete ? `点球大战完成：${homeScore}-${awayScore}` : `第 ${currentRound} 轮，${shooterTeam?.name || '射门方'} 射门，${keeperTeam?.name || '守门方'} 守门`;
  const getKick = (round: number, side: ManualSideKey) => kicks[(round - 1) * 2 + (side === 'home' ? 0 : 1)];
  const renderScoreBalls = (count: number) => count > 0 ? Array.from({ length: count }, (_, index) => <span key={index} aria-label="点球进球">⚽</span>) : <span className="text-gray-400">-</span>;
  const renderKick = (round: number, side: ManualSideKey) => {
    const kick = getKick(round, side);
    const team = side === 'home' ? match.homeTeam : match.awayTeam;
    const isCurrentSide = !complete && round === currentRound && side === nextSide;
    return (
      <div className={`flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center sm:justify-between ${isCurrentSide ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <TeamNameWithFlag team={team} flagClassName="w-5 h-4 flex-shrink-0" />
          {isCurrentSide && <span className="text-xs text-amber-700">当前</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>射门 {kick?.shooter ?? '-'}</span>
          <span>扑救 {kick?.keeper ?? '-'}</span>
          <span className={kick?.keeper === undefined ? 'text-gray-500' : kick.goal ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
            {kick?.keeper === undefined ? '待进行' : (kick.shooter ?? 0) === 0 ? '打飞' : kick.goal ? '进球' : '扑出'}
          </span>
          {isCurrentSide && <button type="button" onClick={onManualRoll} disabled={submitting || saved || complete} className="rounded bg-gray-800 px-3 py-1 text-white hover:bg-gray-900 disabled:opacity-50">上帝摇骰子</button>}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-5 border rounded-lg p-4 bg-amber-50 border-amber-200">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-semibold text-amber-900">点球大战</h3>
          <p className="text-sm text-amber-800 mt-1">射门球员先掷，守门员后掷。射门点数大于或等于守门点数即进球，否则被扑出。</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <div className="rounded-lg border border-amber-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <TeamNameWithFlag team={match.homeTeam} className="font-semibold text-gray-900" flagClassName="w-5 h-4 flex-shrink-0" />
            <span className="text-2xl font-bold text-amber-900">{homeScore}</span>
          </div>
          <div className="mt-2 flex min-h-[28px] flex-wrap gap-1 text-xl">{renderScoreBalls(homeScore)}</div>
        </div>
        <div className="hidden items-center px-2 text-2xl font-bold text-amber-900 md:flex">:</div>
        <div className="rounded-lg border border-amber-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xl font-bold text-amber-900">{awayScore}</span>
            <TeamNameWithFlag team={match.awayTeam} className="font-semibold text-gray-900" flagClassName="w-5 h-4 flex-shrink-0" />
          </div>
          <div className="mt-2 flex min-h-[28px] flex-wrap justify-end gap-1 text-xl">{renderScoreBalls(awayScore)}</div>
        </div>
      </div>
      <div className="sticky top-0 z-10 mt-4 flex flex-wrap items-center gap-3 rounded border border-amber-200 bg-amber-50 py-3">
        <button type="button" onClick={() => onRoll()} disabled={submitting || saved || complete} className="bg-amber-700 text-white px-4 py-2 rounded hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed">自动点球大战</button>
        <span className="text-sm text-amber-900">{message}</span>
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: roundCount }, (_, index) => {
          const round = index + 1;
          const isCurrent = !complete && round === currentRound;
          return (
            <div key={round} className={`w-full rounded-lg border p-3 ${isCurrent ? 'border-amber-300 bg-gray-100' : 'border-gray-200 bg-white'}`}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  {isCurrent && <span aria-label="当前轮次">⚽</span>}
                  <span>第 {round} 轮</span>
                </div>
                {round > 5 && <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">加罚</span>}
              </div>
              <div className="space-y-2">
                {renderKick(round, 'home')}
                {renderKick(round, 'away')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PenaltyDiceModal: React.FC<{ title: string; onClose: () => void; onComplete: (shooter: number, keeper: number) => void }> = ({ title, onClose, onComplete }) => {
  const [rolling, setRolling] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shootValues, setShootValues] = useState([0, 0, 0, 0, 0, 0]);
  const [saveValues, setSaveValues] = useState([0, 0, 0, 0, 0, 0]);
  const [shooterDie, setShooterDie] = useState<number>();
  const [keeperDie, setKeeperDie] = useState<number>();
  const [shootSelectedIndex, setShootSelectedIndex] = useState<number>();
  const [saveSelectedIndex, setSaveSelectedIndex] = useState<number>();
  const [activePanel, setActivePanel] = useState<'shoot' | 'save'>('shoot');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const roll = (panel: 'shoot' | 'save') => {
    if (rolling) return;
    setRolling(true);
    setActivePanel(panel);
    const target = Math.floor(Math.random() * 6);
    const totalTicks = 26 + Math.floor(Math.random() * 8);
    const tick = (index: number) => {
      const done = index >= totalTicks;
      const nextIndex = done ? target : index % 6;
      setActiveIndex(nextIndex);
      const nextValues = Array.from({ length: 6 }, () => panel === 'shoot' ? Math.floor(Math.random() * 7) : Math.floor(Math.random() * 6) + 1);
      if (panel === 'shoot') setShootValues(nextValues);
      else setSaveValues(nextValues);
      if (done) {
        setRolling(false);
        const die = nextValues[target];
        if (panel === 'shoot') {
          setShootValues(current => current.map((value, valueIndex) => valueIndex === target ? die : value));
          setShooterDie(die);
          setShootSelectedIndex(target);
          setActivePanel('save');
        } else {
          setSaveValues(current => current.map((value, valueIndex) => valueIndex === target ? die : value));
          setKeeperDie(die);
          setSaveSelectedIndex(target);
        }
        return;
      }
      const progress = index / totalTicks;
      timerRef.current = setTimeout(() => tick(index + 1), Math.round(35 + progress * progress * 170));
    };
    clearTimer();
    tick(0);
  };
  const resultText = shooterDie !== undefined && keeperDie !== undefined
    ? shooterDie === 0
      ? '打飞'
      : shooterDie >= keeperDie
        ? '进球'
        : '被扑出'
    : '';

  const renderBoard = (label: string, panel: 'shoot' | 'save', result?: number) => (
    <div className={`rounded-lg border p-4 ${activePanel === panel ? 'border-amber-300 bg-amber-50' : 'bg-gray-50'}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-semibold text-gray-900">{label}</div>
        <div className="text-2xl font-bold text-amber-800">{result ?? '-'}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(panel === 'shoot' ? shootValues : saveValues).map((value, index) => {
          const selectedIndex = panel === 'shoot' ? shootSelectedIndex : saveSelectedIndex;
          const selected = selectedIndex === index;
          const active = activePanel === panel && activeIndex === index;
          return (
          <span key={`${label}-${index}`} className={`inline-flex h-14 flex-col items-center justify-center rounded border bg-white font-semibold transition-all ${selected ? 'scale-105 border-amber-500 bg-amber-100 text-amber-800 shadow-sm' : active ? 'scale-105 border-blue-500 bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-900'}`}>
            <span className="text-[10px] leading-none">{index + 1}</span>
            <span className="slot-number-window">
              <span className={`slot-number-strip ${rolling && activePanel === panel ? 'is-rolling' : ''}`}>
                <span>{rolling && activePanel === panel ? ((value + 4) % 6) + 1 : value}</span>
                <span>{value}</span>
                <span>{rolling && activePanel === panel ? (value % 6) + 1 : value}</span>
              </span>
            </span>
          </span>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">上帝正在掷点球骰子</h3>
            <p className="text-sm text-gray-600">{title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={rolling} className="text-gray-500 hover:text-gray-800 disabled:opacity-50">关闭</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {renderBoard('射门', 'shoot', shooterDie)}
          {renderBoard('扑救', 'save', keeperDie)}
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          {resultText && <span className={`mr-auto text-lg font-bold ${resultText === '进球' ? 'text-green-700' : 'text-red-700'}`}>{resultText}</span>}
          {shooterDie === undefined ? (
            <button type="button" onClick={() => roll('shoot')} disabled={rolling} className="bg-amber-700 px-4 py-2 text-white rounded hover:bg-amber-800 disabled:opacity-50">{rolling ? '射门中...' : '射门'}</button>
          ) : keeperDie !== undefined ? (
            <button type="button" onClick={() => onComplete(shooterDie, keeperDie)} className="bg-blue-600 px-4 py-2 text-white rounded hover:bg-blue-700">关闭</button>
          ) : (
            <button type="button" onClick={() => roll('save')} disabled={rolling || keeperDie !== undefined} className="bg-gray-800 px-4 py-2 text-white rounded hover:bg-gray-900 disabled:opacity-50">{rolling ? '扑救中...' : '扑救'}</button>
          )}
        </div>
      </div>
    </div>
  );
};

const ManualMatchModal: React.FC<{
  match: Match;
  game: ManualGame;
  submitting: boolean;
  complete: boolean;
  normalComplete: boolean;
  needsPenalty: boolean;
  penaltyComplete: boolean;
  penaltyKicks: PenaltyKick[];
  penaltyDiceOpen: boolean;
  rollingCount: number;
  rollAllUsed: boolean;
  anyRollStarted: boolean;
  autoSubmit: boolean;
  saved: boolean;
  onClose: () => void;
  onRoll: (half: ManualHalfKey, side: ManualSideKey) => void;
  onRollAll: () => void;
  onRequestLanding: () => void;
  onPenaltyRoll: () => void;
  onPenaltyManualRoll: () => void;
  onPenaltyDiceClose: () => void;
  onPenaltyDiceComplete: (shooter: number, keeper: number) => void;
  onSubmit: () => void;
  getScore: (side: 'home' | 'away') => number;
}> = ({ match, game, submitting, complete, normalComplete, needsPenalty, penaltyComplete, penaltyKicks, penaltyDiceOpen, rollingCount, rollAllUsed, anyRollStarted, autoSubmit, saved, onClose, onRoll, onRollAll, onRequestLanding, onPenaltyRoll, onPenaltyManualRoll, onPenaltyDiceClose, onPenaltyDiceComplete, onSubmit, getScore }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">上帝正在掷骰子</h2>
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
        <span className="text-sm text-gray-600">{saved ? '结果已保存，可关闭窗口查看比赛列表' : needsPenalty ? '常规时间战平，请完成点球大战' : autoSubmit ? '四个结果全部落下后会自动保存' : rollingCount > 0 ? `${rollingCount} 个投掷正在滚动` : '可单独投掷后手动保存，也可一次性投掷并保存'}</span>
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
      {needsPenalty && <PenaltyShootoutPanel match={match} kicks={penaltyKicks} complete={penaltyComplete} submitting={submitting} saved={saved} onRoll={onPenaltyRoll} onManualRoll={onPenaltyManualRoll} />}
      {penaltyDiceOpen && <PenaltyDiceModal title="点球大战掷骰，落子后写入当前射门或扑救。" onClose={onPenaltyDiceClose} onComplete={onPenaltyDiceComplete} />}
      {normalComplete && !needsPenalty && match.groupName && getScore('home') === getScore('away') && <div className="mt-4 border rounded p-3 bg-gray-50 text-sm text-gray-700">小组赛允许平局，可以直接保存。</div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="text-lg font-bold text-gray-900 flex flex-wrap items-center gap-2">当前比分：<TeamNameWithFlag team={match.homeTeam} flagClassName="w-5 h-4 flex-shrink-0" /> {getScore('home')} - {getScore('away')} <TeamNameWithFlag team={match.awayTeam} flagClassName="w-5 h-4 flex-shrink-0" />{needsPenalty && <span className="text-sm text-amber-700">点球 {getPenaltyScore(penaltyKicks, 'home')} - {getPenaltyScore(penaltyKicks, 'away')}</span>}</div>
        <button type="button" disabled={(!complete || submitting || (autoSubmit && !needsPenalty)) && !saved} onClick={saved ? onClose : onSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {saved ? '关闭' : submitting ? '保存中...' : autoSubmit && !needsPenalty ? '等待自动保存' : '保存手工结果'}
        </button>
      </div>
    </div>
  </div>
);

export default TournamentDetail;
