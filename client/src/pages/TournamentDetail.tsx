import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronDown, Play, Search, Star, Trophy, Users } from 'lucide-react';
import { llmAPI, matchAPI, tournamentAPI } from '../services/api';
import { Match, Team, Tournament } from '../types';
import { TeamFlag, TeamLogo, TeamNameWithFlag, getTeamDisplayName } from '../utils/flags';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

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
type AIMatchSession = { id: string; durationMinutes: number; status: 'ready' | 'running' | 'finished' | 'saved'; currentMinute: number; homeScore: number; awayScore: number; homePlan?: any; awayPlan?: any; events?: Array<{ minute: number; type: string; team: string; player?: string; key?: boolean; text: string; broadcastText?: string }>; statistics?: any; engineState?: any; model?: string };
type AIMatchEvent = NonNullable<AIMatchSession['events']>[number];
type AIInteractiveEvent = { minute: number; team: ManualSideKey; player?: string; text: string };
type SyncRealResult = { ok: boolean; updatedCount?: number; provider?: string; fixtureCount?: number; completedFixtureCount?: number; leagueId?: number; leagueName?: string; searchedLeagueIds?: number[]; unmatchedMatches?: string[]; error?: string };
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
const AI_MATCH_TOTAL_MINUTES = 90;
const uiText = (language: 'zh' | 'en') => ({
  notFound: language === 'en' ? 'Tournament not found' : '杯赛未找到',
  close: language === 'en' ? 'Close' : '关闭',
  backToList: language === 'en' ? 'Back to Tournaments' : '返回杯赛列表',
  matchResults: language === 'en' ? 'Match Results' : '比赛结果',
  active: language === 'en' ? 'Active' : '进行中',
  completed: language === 'en' ? 'Completed' : '已完成',
  draft: language === 'en' ? 'Draft' : '草稿',
  teamCount: language === 'en' ? 'Teams' : '球队数量',
  participant: language === 'en' ? 'Participants' : '参赛对象',
  national: language === 'en' ? 'National Teams' : '国家队',
  club: language === 'en' ? 'Clubs' : '俱乐部',
  startTime: language === 'en' ? 'Start Time' : '开始时间',
  tournamentType: language === 'en' ? 'Tournament Type' : '杯赛类型',
  knockout: language === 'en' ? 'Knockout' : '淘汰赛',
  league: language === 'en' ? 'League' : '联赛',
  groupKnockout: language === 'en' ? 'Group Stage + Knockout' : '小组赛 + 淘汰赛',
  groupsSummary: (groups: number, size: number) => language === 'en' ? `${groups} groups, ${size} teams per group` : `${groups} 组，每组 ${size} 队`,
  bracket: language === 'en' ? 'Tournament Bracket' : '杯赛晋级图',
  teams: language === 'en' ? 'Teams' : '参赛球队',
  standings: language === 'en' ? 'Group Standings' : '小组积分榜',
  schedule: language === 'en' ? 'Match Schedule' : '比赛安排',
  showing: (shown: number, total: number, favorites: string[]) => language === 'en'
    ? `Showing ${shown} / ${total} matches${favorites.length ? `, following ${favorites.join(', ')}` : ''}`
    : `当前显示 ${shown} / ${total} 场比赛${favorites.length > 0 ? `，关注 ${favorites.join('、')}` : ''}`,
  syncRealScores: language === 'en' ? 'Sync Real Scores' : '同步真实比分',
  syncing: language === 'en' ? 'Syncing...' : '同步中...',
  syncComplete: language === 'en' ? 'Sync Complete' : '同步完成',
  syncFailed: language === 'en' ? 'Sync Failed' : '同步失败',
  syncUpdated: (count: number) => language === 'en' ? `${count} matches updated` : `更新 ${count} 场比赛`,
  syncProvider: language === 'en' ? 'Provider' : '数据源',
  syncFixtureCount: language === 'en' ? 'API matches' : '接口比赛数',
  syncCompletedFixtureCount: language === 'en' ? 'Completed matches available' : '可同步完成比赛',
  syncLeague: language === 'en' ? 'API competition' : '接口赛事',
  syncSearchedLeagueIds: language === 'en' ? 'Searched league IDs' : '已搜索赛事ID',
  syncUnmatched: language === 'en' ? 'Unmatched examples' : '未匹配示例',
  nextMatch: language === 'en' ? 'Next Match' : '下一场比赛',
  startFiltered: language === 'en' ? 'Start Filtered Matches' : '开始当前筛选比赛',
  starting: language === 'en' ? 'Starting...' : '正在开始...',
  allCompleted: language === 'en' ? 'All completed' : '全部完成',
  partial: language === 'en' ? 'Incomplete' : '有未完成',
  notStarted: language === 'en' ? 'Not started' : '未开始',
  round: (round: number | string) => language === 'en' ? `Round ${round}` : `第 ${round} 轮`,
  completedCount: (done: number, total: number) => language === 'en' ? `${done}/${total} completed` : `${done}/${total} 已完成`,
  noMatches: language === 'en' ? 'No matches match the current filters.' : '没有符合当前筛选条件的比赛。',
  top: language === 'en' ? 'Top' : '顶部',
  bottom: language === 'en' ? 'Bottom' : '底部',
  next: language === 'en' ? 'Next' : '下一场',
  champion: language === 'en' ? 'Champion' : '冠军',
  pending: language === 'en' ? 'Pending' : '待定',
  bracketHint: language === 'en' ? 'Left groups advance right, right groups advance left, with the final in the center' : '左侧小组向右晋级，右侧小组向左晋级，中心为决赛',
  leftGroups: language === 'en' ? 'Left Groups' : '左侧小组',
  rightGroups: language === 'en' ? 'Right Groups' : '右侧小组',
  final: language === 'en' ? 'Final' : '决赛',
  finalPending: language === 'en' ? 'Final pending' : '决赛待生成',
  qualified: language === 'en' ? 'Qualified' : '晋级',
  noGroups: language === 'en' ? 'No groups yet' : '暂无小组',
  rank: language === 'en' ? 'Rank' : '排名',
  team: language === 'en' ? 'Team' : '球队',
  played: language === 'en' ? 'P' : '赛',
  wins: language === 'en' ? 'W' : '胜',
  draws: language === 'en' ? 'D' : '平',
  losses: language === 'en' ? 'L' : '负',
  gf: language === 'en' ? 'GF' : '进',
  ga: language === 'en' ? 'GA' : '失',
  gd: language === 'en' ? 'GD' : '净',
  points: language === 'en' ? 'Pts' : '分',
  searchTeam: language === 'en' ? 'Search teams' : '搜索球队',
  allStages: language === 'en' ? 'All stages' : '全部阶段',
  allRounds: language === 'en' ? 'All rounds' : '全部轮次',
  allStatuses: language === 'en' ? 'All statuses' : '全部状态',
  scheduled: language === 'en' ? 'Scheduled' : '待进行',
  inProgress: language === 'en' ? 'In progress' : '进行中',
  roundAsc: language === 'en' ? 'Round ascending' : '轮次优先',
  roundDesc: language === 'en' ? 'Round descending' : '轮次降序',
  teamAsc: language === 'en' ? 'Home team' : '主队名称',
  onlyFavorites: language === 'en' ? 'Only favorite teams' : '只看关注球队的比赛',
  penalties: language === 'en' ? 'Penalties' : '点球',
  godDice: language === 'en' ? 'God Dice' : '上帝摇骰子',
  autoRun: language === 'en' ? 'Auto Run' : '自动进行',
  dice: language === 'en' ? 'Dice' : '掷骰子',
  aiDuel: language === 'en' ? 'AI Duel' : 'AI对决',
  viewDetail: language === 'en' ? 'Details' : '查看详情',
  viewStats: language === 'en' ? 'Stats' : '查看统计',
  startingOne: language === 'en' ? 'Starting...' : '开始中...',
  timePending: language === 'en' ? 'Time pending' : '时间待定',
  teamPending: language === 'en' ? 'TBD' : '待定'
});
const stageName = (name: string | undefined, language: 'zh' | 'en') => {
  const value = name || KNOCKOUT_GROUP_NAME;
  if (language === 'zh') return value;
  const group = value.match(/^([A-Z])组$/);
  if (group) return `Group ${group[1]}`;
  const numericGroup = value.match(/^第(\d+)组$/);
  if (numericGroup) return `Group ${numericGroup[1]}`;
  const map: Record<string, string> = {
    [KNOCKOUT_GROUP_NAME]: 'Knockout',
    [UNGROUPED_NAME]: 'Ungrouped',
    '128强': 'Round of 128',
    '64强': 'Round of 64',
    '32强': 'Round of 32',
    '16强': 'Round of 16',
    '8强': 'Quarter-finals',
    '4强': 'Semi-finals',
    '六十四分之一决赛': 'Round of 128',
    '三十二分之一决赛': 'Round of 64',
    '十六分之一决赛': 'Round of 32',
    '八分之一决赛': 'Round of 16',
    '四分之一决赛': 'Quarter-finals',
    '半决赛': 'Semi-finals',
    '三四名决赛': 'Third-place Match',
    '决赛': 'Final'
  };
  return map[value] || value.replace(/(\d+)进(\d+)/, 'Round of $1');
};
const formatAIMatchClock = (value: number) => {
  const minute = Math.floor(value);
  const second = Math.floor((value - minute) * 60);
  return `${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
};
const formatPlayerDisplayName = (player: any, language: 'zh' | 'en' = 'zh', fallback = '球员') => {
  if (language === 'en') return player?.nameEn || player?.name || player?.nameZh || fallback;
  if (player?.nameZh) return player.nameZh;
  const raw = String(player?.name || player?.nameEn || '').trim();
  if (!raw) return fallback;
  const parts = raw.split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts[parts.length - 1] : raw;
  return player?.number ? `${player.number}号 ${surname}` : surname;
};
const formatAIEventText = (text?: string, event?: { team?: string; player?: string }, session?: AIMatchSession | null) => {
  let value = cleanDiceNarrationText(text)
    .replace(/^上帝摇骰子判定[:：]\s*/, '');
  const playerName = event?.player;
  if (!playerName || /\d+号/.test(playerName)) return value;
  const plan = event?.team === 'away' ? session?.awayPlan : event?.team === 'home' ? session?.homePlan : undefined;
  const player = Array.isArray(plan?.lineup) ? plan.lineup.find((item: any) => item.name === playerName) : undefined;
  if (player?.number && value.includes(playerName) && !value.includes(`${player.number}号 ${playerName}`)) {
    value = value.replace(playerName, `${player.number}号 ${playerName}`);
  }
  return value;
};
const cleanDiceNarrationText = (text?: string) => String(text || '')
    .replace(/^上帝摇骰子判定[:：]\s*/, '')
    .replace(/。?射门\s*\d+，扑救\s*\d+，(?:门将扑出|皮球入网|射门打飞)。?/g, '')
    .replace(/\.?\s*Shot\s*\d+,\s*save\s*\d+,\s*(?:the shot flies wide|the ball is in|the goalkeeper saves it)\.?/gi, '')
    .trim();
const cleanAIScoreText = (text: string, session?: AIMatchSession | null) => {
  if (!session) return text;
  const scoreText = `${session.homeScore}比${session.awayScore}`;
  return text
    .replace(/\d+\s*比\s*\d+/g, scoreText)
    .replace(/比分(?:变为|来到|是)?\s*\d+\s*[-:：]\s*\d+/g, `比分${session.homeScore}-${session.awayScore}`)
    .replace(/score(?: is| becomes| now)?\s*\d+\s*[-:]\s*\d+/gi, `score is ${session.homeScore}-${session.awayScore}`);
};
const formatAIBroadcastText = (event?: AIMatchEvent, session?: AIMatchSession | null, language: 'zh' | 'en' = 'zh') => {
  if (!event) return language === 'en' ? 'The booth is waiting for kickoff.' : '解说席正在连线，等待开球哨响。';
  if (event.broadcastText) return cleanAIScoreText(cleanDiceNarrationText(event.broadcastText), session);
  return cleanAIScoreText(formatAIEventText(event.text, event, session), session);
};
const isUrgentAIEvent = (event?: AIMatchEvent) => ['goal', 'penalty', 'card', 'injury'].includes(event?.type || '');
const isPendingInteractiveAIEvent = (event?: AIMatchEvent) => event?.type === 'chance' || event?.type === 'penalty';
const formatAIUrgentBroadcastText = (event?: AIMatchEvent, session?: AIMatchSession | null, language: 'zh' | 'en' = 'zh') => {
  if (!event) return '';
  if (event.broadcastText) return cleanAIScoreText(String(event.broadcastText).trim(), session);
  return formatAIBroadcastText(event, session, language);
};
const splitVoiceText = (text: string, language: 'zh' | 'en') => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const maxLength = language === 'en' ? 130 : 48;
  const sentenceParts = normalized.match(/[^。！？!?]+[。！？!?]?/g) || [normalized];
  const parts: string[] = [];

  sentenceParts.forEach(sentence => {
    const value = sentence.trim();
    if (!value) return;
    if (value.length <= maxLength) {
      parts.push(value);
      return;
    }

    const clauses = value.split(/(?<=[，,；;：:])\s*/).filter(Boolean);
    let buffer = '';
    clauses.forEach(clause => {
      const next = `${buffer}${clause}`.trim();
      if (next.length > maxLength && buffer) {
        parts.push(buffer.trim());
        buffer = clause;
      } else {
        buffer = next;
      }
    });
    if (buffer.trim()) parts.push(buffer.trim());
  });

  return parts.length ? parts : [normalized];
};
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
const isThirdPlaceMatch = (match: Match) => match.stage === 'third_place' || match.bracketStage === '三四名决赛' || !!match.bracketSlot?.startsWith('TP');
const isFinalMatch = (match: Match) => match.bracketStage === '决赛' || match.bracketSlot === 'F-1';
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
    if (!match.groupName && !isThirdPlaceMatch(match)) acc[match.round] = (acc[match.round] || 0) + 1;
    return acc;
  }, {});
  return matches.reduce<Record<string, string>>((lookup, match) => {
    lookup[match.id] = match.groupName || match.bracketStage || (isThirdPlaceMatch(match) ? '三四名决赛' : getKnockoutStageLabel(counts[match.round] || 0));
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
const compareNextMatchOrder = (a: Match, b: Match, lookup: Record<string, string>) => {
  const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  return compareMatches(a, b, 'round-asc', lookup);
};
const scrollElementToViewportCenter = (element: HTMLElement, behavior: ScrollBehavior = 'smooth') => {
  const rect = element.getBoundingClientRect();
  const pageTop = window.pageYOffset || document.documentElement.scrollTop || 0;
  const targetTop = pageTop + rect.top - Math.max(0, (window.innerHeight - rect.height) / 2);
  window.scrollTo({ top: Math.max(0, targetTop), behavior });
};
const formatMatchTime = (value?: string) => value ? new Date(value).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '时间待定';
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

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

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
    .filter(match => !match.groupName && !isThirdPlaceMatch(match))
    .sort((a, b) => a.round - b.round || a.id.localeCompare(b.id));
  const byRound = knockoutMatches.reduce<Record<number, Match[]>>((rounds, match) => {
    rounds[match.round] = rounds[match.round] || [];
    rounds[match.round].push(match);
    return rounds;
  }, {});
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
  const explicitFinalMatch = knockoutMatches.find(isFinalMatch);
  const finalRound = explicitFinalMatch?.round ?? rounds.find(round => byRound[round].length === 1) ?? rounds[rounds.length - 1];
  const finalMatch = explicitFinalMatch || (finalRound !== undefined ? byRound[finalRound]?.[0] : undefined);
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
  const { user } = useAuth();
  const { language } = useI18n();
  const text = uiText(language);
  const [tournament, setTournament] = useState<TournamentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingMatch, setStartingMatch] = useState<string | null>(null);
  const [startingAll, setStartingAll] = useState(false);
  const [syncingRealResults, setSyncingRealResults] = useState(false);
  const [syncRealResult, setSyncRealResult] = useState<SyncRealResult | null>(null);
  const [manualMatch, setManualMatch] = useState<Match | null>(null);
  const [manualGame, setManualGame] = useState<ManualGame>(emptyManualGame());
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualAutoSubmit, setManualAutoSubmit] = useState(false);
  const [manualRollAllUsed, setManualRollAllUsed] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);
  const [penaltyKicks, setPenaltyKicks] = useState<PenaltyKick[]>([]);
  const [penaltyDiceOpen, setPenaltyDiceOpen] = useState(false);
  const [aiMatch, setAiMatch] = useState<Match | null>(null);
  const [aiSession, setAiSession] = useState<AIMatchSession | null>(null);
  const [aiDuration, setAiDuration] = useState(6);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiFinishing, setAiFinishing] = useState(false);
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(false);
  const [aiHalftimePaused, setAiHalftimePaused] = useState(false);
  const [aiPenaltyKicks, setAiPenaltyKicks] = useState<PenaltyKick[]>([]);
  const [aiPenaltyDiceOpen, setAiPenaltyDiceOpen] = useState(false);
  const [aiInteractiveEvent, setAiInteractiveEvent] = useState<AIInteractiveEvent | null>(null);
  const [aiAutoShotResolution, setAiAutoShotResolution] = useState(false);
  const aiAutoShotResolutionRef = useRef(false);
  const aiHalftimeResolver = useRef<(() => void) | null>(null);
  const aiInteractiveResolver = useRef<((result?: { shooter: number; keeper: number }) => void) | null>(null);
  const aiRunTokenRef = useRef(0);
  const aiVoiceQueueRef = useRef<Array<{ text: string; urgent: boolean }>>([]);
  const aiVoicePlayingRef = useRef(false);
  const spokenAIEventKeysRef = useRef<Set<string>>(new Set());
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
  const [pendingScrollMatchId, setPendingScrollMatchId] = useState<string | null>(null);
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
  useEffect(() => { aiAutoShotResolutionRef.current = aiAutoShotResolution; }, [aiAutoShotResolution]);
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
  const nextScheduledMatch = useMemo(() => scheduleMatches
    .filter(match => match.status === 'scheduled' && match.homeTeam && match.awayTeam)
    .sort((a, b) => compareNextMatchOrder(a, b, stageLookup))[0], [scheduleMatches, stageLookup]);
  const canSyncRealResults = Boolean(tournament?.realTournamentTemplate) && matches.length > 0 && matches.every(match => match.status === 'scheduled');
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

  useEffect(() => {
    if (!pendingScrollMatchId) return;
    let attempts = 0;
    let cancelled = false;
    const scroll = () => {
      if (cancelled) return;
      const element = document.getElementById(`match-${pendingScrollMatchId}`);
      if (element) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (cancelled) return;
            scrollElementToViewportCenter(element, 'smooth');
            window.setTimeout(() => {
              if (cancelled) return;
              const latestElement = document.getElementById(`match-${pendingScrollMatchId}`);
              if (latestElement) scrollElementToViewportCenter(latestElement, 'auto');
              setPendingScrollMatchId(null);
            }, 450);
          });
        });
        return;
      }
      attempts += 1;
      if (attempts < 12) window.setTimeout(scroll, 50);
    };
    window.setTimeout(scroll, 0);
    return () => { cancelled = true; };
  }, [pendingScrollMatchId, filteredMatchesByRound]);

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
  const handleSyncRealResults = async () => {
    if (!tournament || syncingRealResults) return;
    setSyncingRealResults(true);
    try {
      const response = await tournamentAPI.syncRealResults(tournament.id);
      await fetchTournament();
      setSyncRealResult({ ok: true, ...response.data });
    } catch (error: any) {
      setSyncRealResult({ ok: false, error: error.response?.data?.error || error.message || (language === 'en' ? 'Failed to sync real scores' : '同步真实比分失败') });
    } finally {
      setSyncingRealResults(false);
    }
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
  const getAIEventVoiceKey = (event: AIMatchEvent) => [
    event.minute,
    event.type,
    event.team,
    event.player || '',
    event.broadcastText || event.text || ''
  ].join('|');
  const speakAIEvents = (session: AIMatchSession, previousEventCount?: number) => {
    if (!aiVoiceEnabled || !('speechSynthesis' in window)) return;
    const candidateEvents = previousEventCount === undefined ? (session.events || []) : (session.events || []).slice(previousEventCount);
    const newEvents = candidateEvents.filter(event => !isPendingInteractiveAIEvent(event) && !spokenAIEventKeysRef.current.has(getAIEventVoiceKey(event)));
    const latestEvent = newEvents[newEvents.length - 1];
    if (!latestEvent) return;
    newEvents.forEach(event => spokenAIEventKeysRef.current.add(getAIEventVoiceKey(event)));
    const urgent = isUrgentAIEvent(latestEvent);
    const text = urgent ? formatAIUrgentBroadcastText(latestEvent, session, language) : formatAIBroadcastText(latestEvent, session, language);
    if (!text) return;
    enqueueAIVoice(text, urgent ? 'priority' : 'queue');
  };
  const playNextAIVoice = () => {
    if (!('speechSynthesis' in window) || aiVoicePlayingRef.current) return;
    const next = aiVoiceQueueRef.current.shift();
    if (!next) return;
    aiVoicePlayingRef.current = true;
    const utterance = new SpeechSynthesisUtterance(next.text);
    utterance.lang = language === 'en' ? 'en-US' : 'zh-CN';
    utterance.rate = next.urgent ? 1.38 : 1.28;
    utterance.pitch = next.urgent ? 1.32 : 1.12;
    utterance.volume = 1;
    utterance.onend = () => {
      aiVoicePlayingRef.current = false;
      playNextAIVoice();
    };
    utterance.onerror = () => {
      aiVoicePlayingRef.current = false;
      playNextAIVoice();
    };
    window.speechSynthesis.speak(utterance);
  };
  const enqueueAIVoice = (text: string, mode: 'queue' | 'priority' | 'interrupt' = 'queue') => {
    if (!aiVoiceEnabled || !('speechSynthesis' in window) || !text) return;
    const segments = splitVoiceText(text, language).map(segment => ({ text: segment, urgent: mode !== 'queue' }));
    if (segments.length === 0) return;
    if (mode === 'interrupt') {
      aiVoiceQueueRef.current = [];
      aiVoicePlayingRef.current = false;
      window.speechSynthesis.cancel();
      aiVoiceQueueRef.current.push(...segments);
    } else if (mode === 'priority') {
      aiVoiceQueueRef.current = segments;
    } else {
      aiVoiceQueueRef.current = segments;
    }
    playNextAIVoice();
  };
  const stopAIVoice = () => {
    aiVoiceQueueRef.current = [];
    aiVoicePlayingRef.current = false;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };
  const rollAIShotDie = () => Math.floor(Math.random() * 7);
  const rollAISaveDie = () => Math.floor(Math.random() * 6) + 1;
  const openAIMatch = async (match: Match) => {
    aiRunTokenRef.current += 1;
    setAiMatch(match);
    setAiSession(null);
    setAiDuration(6);
    setAiRunning(false);
    setAiSaving(false);
    setAiFinishing(false);
    setAiHalftimePaused(false);
    setAiPenaltyKicks([]);
    setAiPenaltyDiceOpen(false);
    setAiInteractiveEvent(null);
    setAiAutoShotResolution(false);
    aiAutoShotResolutionRef.current = false;
    spokenAIEventKeysRef.current = new Set();
    setAiVoiceEnabled(true);
  };
  const startAIDuel = async () => {
    if (!aiMatch || aiRunning) return;
    const runToken = aiRunTokenRef.current + 1;
    aiRunTokenRef.current = runToken;
    setAiRunning(true);
    try {
      const created = await llmAPI.createSession(aiMatch.id, { durationMinutes: aiDuration, language });
      let current = created.data as AIMatchSession;
      let halftimeHandled = false;
      setAiSession(current);
      const segmentMinutes = current.engineState?.segmentMinutes || 5;
      const intervalMs = Math.max(250, Math.round((aiDuration * 60 * 1000) / (AI_MATCH_TOTAL_MINUTES / segmentMinutes)));
      while (current.status !== 'finished' && current.status !== 'saved') {
        if (aiRunTokenRef.current !== runToken) return;
        const previousEventCount = current.events?.length || 0;
        const stepStartedAt = Date.now();
        const response = await llmAPI.stepSession(current.id);
        if (aiRunTokenRef.current !== runToken) return;
        current = response.data as AIMatchSession;
        setAiSession(current);
        const interactiveEvent = (current.events || []).slice(previousEventCount).find(event => event.type === 'chance' || event.type === 'penalty');
        if (interactiveEvent) {
          const team: ManualSideKey = interactiveEvent.team === 'away' ? 'away' : 'home';
          const autoShotResolution = aiAutoShotResolutionRef.current;
          if (!autoShotResolution) {
            stopAIVoice();
            setAiInteractiveEvent({ minute: interactiveEvent.minute, team, player: interactiveEvent.player, text: interactiveEvent.text });
            setAiRunning(false);
          }
          const diceResult = autoShotResolution
            ? { shooter: rollAIShotDie(), keeper: rollAISaveDie() }
            : await new Promise<{ shooter: number; keeper: number } | undefined>(resolve => { aiInteractiveResolver.current = resolve; });
          if (aiRunTokenRef.current !== runToken) return;
          if (!autoShotResolution) {
            setAiInteractiveEvent(null);
            setAiRunning(true);
          }
          if (diceResult) {
            const goal = diceResult.shooter > 0 && diceResult.shooter >= diceResult.keeper;
            const cleanText = interactiveEvent.text
              .replace(new RegExp(`^第?${interactiveEvent.minute}['’分钟\\s，,：:]*`), '')
              .replace(/[。.!！?？\s]+$/, '');
            const feedbackText = language === 'en'
              ? `God dice decision: ${cleanText}. ${diceResult.shooter === 0 ? 'The shot flies wide.' : goal ? 'The ball is in.' : 'The goalkeeper saves it.'}`
              : `上帝摇骰子判定：${cleanText}。${diceResult.shooter === 0 ? '射门打飞。' : goal ? '皮球入网。' : '门将扑出。'}`;
            const feedbackPreviousEventCount = current.events?.length || 0;
            const feedback = await llmAPI.appendSessionEvent(current.id, {
              minute: interactiveEvent.minute,
              type: goal ? 'goal' : 'save',
              team,
              player: interactiveEvent.player,
              text: feedbackText,
              dice: diceResult
            });
            current = feedback.data as AIMatchSession;
            setAiSession(current);
            speakAIEvents(current, feedbackPreviousEventCount);
          }
        } else {
          speakAIEvents(current, previousEventCount);
        }
        if (!halftimeHandled && current.currentMinute >= 45 && current.status !== 'finished') {
          halftimeHandled = true;
          setAiHalftimePaused(true);
          setAiRunning(false);
          const halftimeVoiceKey = `${current.id}|halftime`;
          if (aiVoiceEnabled && 'speechSynthesis' in window && !spokenAIEventKeysRef.current.has(halftimeVoiceKey)) {
            spokenAIEventKeysRef.current.add(halftimeVoiceKey);
            const utterance = new SpeechSynthesisUtterance(language === 'en' ? 'The first half is over. The players head back to the dressing rooms. We will continue after halftime.' : '上半场比赛结束，双方球员回到更衣室，中场休息后我们继续。');
            utterance.lang = language === 'en' ? 'en-US' : 'zh-CN';
            utterance.rate = 1.22;
            utterance.pitch = 1.08;
            window.speechSynthesis.speak(utterance);
          }
          await new Promise<void>(resolve => { aiHalftimeResolver.current = resolve; });
          if (aiRunTokenRef.current !== runToken) return;
          setAiHalftimePaused(false);
          setAiRunning(true);
        }
        if (current.status !== 'finished') await wait(Math.max(0, intervalMs - (Date.now() - stepStartedAt)));
      }
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'AI 对决失败');
    } finally {
      setAiRunning(false);
    }
  };
  const continueAISecondHalf = () => {
    setAiHalftimePaused(false);
    setAiRunning(true);
    aiHalftimeResolver.current?.();
    aiHalftimeResolver.current = null;
  };
  const saveAIDuel = async () => {
    if (!aiMatch || !aiSession || aiSession.status !== 'finished') return;
    const aiNeedsPenalty = !aiMatch.groupName && aiSession.homeScore === aiSession.awayScore;
    const aiPenaltyComplete = getPenaltyComplete(aiPenaltyKicks);
    if (aiNeedsPenalty && !aiPenaltyComplete) {
      alert('淘汰赛平局需要先完成点球大战');
      return;
    }
    setAiSaving(true);
    try {
      await matchAPI.manual(aiMatch.id, {
        homeScore: aiSession.homeScore,
        awayScore: aiSession.awayScore,
        homePenaltyScore: aiNeedsPenalty ? getPenaltyScore(aiPenaltyKicks, 'home') : undefined,
        awayPenaltyScore: aiNeedsPenalty ? getPenaltyScore(aiPenaltyKicks, 'away') : undefined,
        manualDetails: {
          source: 'ai_duel',
          durationMinutes: aiSession.durationMinutes,
          model: aiSession.model,
          homePlan: aiSession.homePlan,
          awayPlan: aiSession.awayPlan,
          events: aiSession.events || [],
          penalties: aiNeedsPenalty ? aiPenaltyKicks : undefined,
          statistics: aiSession.statistics || {},
          commentary: (aiSession.events || []).map(event => `${event.minute}' ${event.text}`)
        }
      });
      await llmAPI.markSaved(aiSession.id);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setAiMatch(null);
      setAiSession(null);
      setAiHalftimePaused(false);
      setAiPenaltyKicks([]);
      setAiPenaltyDiceOpen(false);
      setAiInteractiveEvent(null);
      await fetchTournament();
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || '保存 AI 对决结果失败');
    } finally {
      setAiSaving(false);
    }
  };
  const finishAIDuel = async () => {
    if (!aiMatch || aiFinishing) return;
    aiRunTokenRef.current += 1;
    setAiFinishing(true);
    setAiRunning(false);
    setAiHalftimePaused(false);
    aiHalftimeResolver.current?.();
    aiInteractiveResolver.current?.();
    aiHalftimeResolver.current = null;
    aiInteractiveResolver.current = null;
    setAiInteractiveEvent(null);
    try {
      let current = aiSession;
      if (!current) {
        const created = await llmAPI.createSession(aiMatch.id, { durationMinutes: aiDuration, language });
        current = created.data as AIMatchSession;
      }
      const response = await llmAPI.finishSession(current.id);
      setAiSession(response.data as AIMatchSession);
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || '快速完成失败');
    } finally {
      setAiFinishing(false);
    }
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
  const createPenaltyKick = (side: ManualSideKey): PenaltyKick => {
    const shooter = rollPenaltyShotDie();
    const keeper = rollPenaltySaveDie();
    return { side, shooter, keeper, goal: shooter > 0 && shooter >= keeper };
  };
  const autoCompletePenaltyShootout = () => {
    if (submittingManual || manualSaved || !manualNeedsPenalty || penaltyComplete) return;
    const kicks: PenaltyKick[] = [];
    while (true) {
      kicks.push(createPenaltyKick('home'));
      kicks.push(createPenaltyKick('away'));
      const rounds = kicks.length / 2;
      if (rounds >= 5 && getPenaltyScore(kicks, 'home') !== getPenaltyScore(kicks, 'away')) break;
    }
    setPenaltyKicks(kicks);
  };
  const autoCompleteAIPenaltyShootout = () => {
    if (aiSaving || !aiMatch || !aiSession || aiSession.homeScore !== aiSession.awayScore || getPenaltyComplete(aiPenaltyKicks)) return;
    const kicks: PenaltyKick[] = [];
    while (true) {
      kicks.push(createPenaltyKick('home'));
      kicks.push(createPenaltyKick('away'));
      const rounds = kicks.length / 2;
      if (rounds >= 5 && getPenaltyScore(kicks, 'home') !== getPenaltyScore(kicks, 'away')) break;
    }
    setAiPenaltyKicks(kicks);
  };
  const openPenaltyDice = () => {
    if (submittingManual || manualSaved || !manualNeedsPenalty || penaltyComplete) return;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
  const completeAIPenaltyKick = (shooter: number, keeper: number) => {
    if (aiSaving || !aiMatch || !aiSession || aiSession.homeScore !== aiSession.awayScore || getPenaltyComplete(aiPenaltyKicks)) return;
    setAiPenaltyKicks(current => {
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
    setSortMode('round-asc');
    setCollapsedRounds(current => {
      const next = new Set(current);
      next.delete(nextScheduledMatch.round);
      return next;
    });
    setPendingScrollMatchId(nextScheduledMatch.id);
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
  if (!tournament) return <div className="text-center py-12">{text.notFound}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <Link to="/tournaments" className="flex items-center text-blue-600 hover:text-blue-800 mb-4"><ArrowLeft className="w-4 h-4 mr-2" />{text.backToList}</Link>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4 gap-4">
          <div><h1 className="text-3xl font-bold text-gray-900 mb-2">{tournament.name}</h1><p className="text-gray-600">{tournament.description}</p></div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {matches.length > 0 && <button type="button" onClick={handleJumpToResults} className="inline-flex items-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"><Trophy className="w-4 h-4 mr-2" />{text.matchResults}{completedMatchesCount > 0 ? ` (${completedMatchesCount})` : ''}</button>}
            <span className={`px-3 py-1 text-sm rounded-full ${tournament.status === 'active' ? 'bg-green-100 text-green-800' : tournament.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>{tournament.status === 'active' ? text.active : tournament.status === 'completed' ? text.completed : text.draft}</span>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <InfoCard icon={<Users className="w-5 h-5 text-blue-600" />} label={text.teamCount} value={String(tournament.teamCount)} />
          <InfoCard icon={<Users className="w-5 h-5 text-indigo-600" />} label={text.participant} value={tournament.teamCategory === 'national' ? text.national : text.club} />
          <InfoCard icon={<Calendar className="w-5 h-5 text-green-600" />} label={text.startTime} value={tournament.startTime ? new Date(tournament.startTime).toLocaleString() : new Date(tournament.createdAt).toLocaleDateString()} />
          <InfoCard icon={<Trophy className="w-5 h-5 text-purple-600" />} label={text.tournamentType} value={tournament.type === 'knockout' ? text.knockout : tournament.type === 'league' ? text.league : text.groupKnockout} detail={isGroupTournament && tournament.groupSize ? text.groupsSummary(tournament.teamCount / tournament.groupSize, tournament.groupSize) : undefined} />
        </div>
        {teams.length > 0 && (
          <CollapsibleSection title={text.bracket} open={bracketOpen} onToggle={() => setBracketOpen(open => !open)}>
            <TournamentBracket groupedTeams={groupedTeams} standings={groupStandings} completedGroupNames={completedGroupNames} columns={bracketColumns} champion={championInfo} />
          </CollapsibleSection>
        )}
        {teams.length > 0 && (
          <CollapsibleSection title={text.teams} open={teamsOpen} onToggle={() => setTeamsOpen(open => !open)}>
            {isGroupTournament ? <div className="grid lg:grid-cols-2 gap-4">{Object.entries(groupedTeams).sort(([a], [b]) => compareGroupNames(a, b)).map(([name, groupTeams]) => <TeamGroup key={name} groupName={name} teams={groupTeams} favoriteTeamIds={favoriteTeamIds} onToggleFavorite={toggleFavoriteTeam} />)}</div> : <div className="grid md:grid-cols-2 gap-4">{teams.map(team => <TeamCard key={team.id} team={team} isFavorite={favoriteTeamIds.includes(team.id)} onToggleFavorite={toggleFavoriteTeam} />)}</div>}
          </CollapsibleSection>
        )}
        {isGroupTournament && Object.keys(groupStandings).length > 0 && (
          <CollapsibleSection title={text.standings} open={standingsOpen} onToggle={() => setStandingsOpen(open => !open)}>
            <Standings standings={groupStandings} completedGroupNames={completedGroupNames} />
          </CollapsibleSection>
        )}
        {matches.length > 0 && (
          <section id="match-schedule" className="mt-8 scroll-mt-4">
            <div className="flex justify-between items-center mb-4">
              <div><h3 className="text-xl font-semibold text-gray-900">{text.schedule}</h3><p className="text-sm text-gray-600 mt-1">{text.showing(filteredMatches.length, scheduleMatches.length, favoriteTeams.map(team => getTeamDisplayName(team, language)))}</p></div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {canSyncRealResults && <button onClick={handleSyncRealResults} disabled={syncingRealResults} className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center"><Play className="w-4 h-4 mr-2" />{syncingRealResults ? text.syncing : text.syncRealScores}</button>}
                {nextScheduledMatch && <button onClick={handleJumpToNextScheduledMatch} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"><Play className="w-4 h-4 mr-2" />{text.nextMatch}</button>}
                {filteredMatches.some(match => match.status === 'scheduled' && match.homeTeam && match.awayTeam) && <button onClick={handleStartAllMatches} disabled={startingAll} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center"><Play className="w-4 h-4 mr-2" />{startingAll ? text.starting : text.startFiltered}</button>}
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
                const roundStatusText = roundStatus === 'completed' ? text.allCompleted : roundStatus === 'partial' ? text.partial : text.notStarted;
                return (
                  <div key={round} className="border rounded-lg bg-gray-50 overflow-hidden">
                    <button type="button" onClick={() => toggleRoundCollapsed(roundNumber)} className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-100">
                      <h4 className="font-semibold text-gray-900">{text.round(round)}</h4>
                      <span className="flex items-center gap-3 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${roundStatusClass}`}>{roundStatusText}</span>
                        <span>{text.completedCount(completedRoundMatches, roundMatches.length)}</span>
                        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
                      </span>
                    </button>
                    {!collapsed && (
                      <div className="space-y-4 p-4 pt-1">
                        {Object.entries(stageGroups).sort(([a], [b]) => compareMatchStageNames(a, b)).map(([name, groupMatches]) => (
                          <div key={`${round}-${name}`}>
                            <div className="text-sm font-medium text-gray-700 mb-2">{stageName(name, language)}</div>
                            <div className="space-y-3">
                          {groupMatches.map(match => <MatchRow key={match.id} match={match} favoriteTeamIds={favoriteTeamIds} startingMatch={startingMatch} onStart={handleStartMatch} onManualStart={openManualMatch} onAIStart={openAIMatch} />)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {filteredMatches.length === 0 && <div className="border rounded-lg p-8 text-center text-gray-500">{text.noMatches}</div>}
          </section>
        )}
      </div>
      {manualMatch && <ManualMatchModal match={manualMatch} game={manualGame} submitting={submittingManual} complete={manualReadyToSave} normalComplete={manualGameComplete} needsPenalty={manualNeedsPenalty} penaltyComplete={penaltyComplete} penaltyKicks={penaltyKicks} penaltyDiceOpen={penaltyDiceOpen} rollingCount={manualRollingCount} rollAllUsed={manualRollAllUsed} anyRollStarted={manualAnyRollStarted} autoSubmit={manualAutoSubmit} saved={manualSaved} onClose={() => { clearAllManualRollTimers(); setManualAutoSubmit(false); setManualRollAllUsed(false); setManualSaved(false); setPenaltyKicks([]); setPenaltyDiceOpen(false); setManualMatch(null); }} onRoll={rollManualSide} onRollAll={rollAllManualSides} onRequestLanding={requestManualLanding} onPenaltyRoll={autoCompletePenaltyShootout} onPenaltyManualRoll={openPenaltyDice} onPenaltyDiceClose={() => setPenaltyDiceOpen(false)} onPenaltyDiceComplete={(shooter, keeper) => { completeManualPenaltyKick(shooter, keeper); setPenaltyDiceOpen(false); }} onSubmit={submitManualMatch} getScore={getManualScore} />}
      {syncRealResult && <SyncRealResultModal result={syncRealResult} onClose={() => setSyncRealResult(null)} />}
      {aiMatch && <AIMatchModal match={aiMatch} session={aiSession} duration={aiDuration} running={aiRunning} saving={aiSaving} finishing={aiFinishing} voiceEnabled={aiVoiceEnabled} autoShotResolution={aiAutoShotResolution} halftimePaused={aiHalftimePaused} interactiveEvent={aiInteractiveEvent} penaltyKicks={aiPenaltyKicks} penaltyDiceOpen={aiPenaltyDiceOpen} isAdmin={user?.role === 'admin'} onDurationChange={setAiDuration} onVoiceChange={setAiVoiceEnabled} onAutoShotResolutionChange={setAiAutoShotResolution} onContinueSecondHalf={continueAISecondHalf} onInteractiveDiceClose={() => { aiInteractiveResolver.current?.(); aiInteractiveResolver.current = null; setAiInteractiveEvent(null); setAiRunning(true); }} onInteractiveDiceComplete={(shooter, keeper) => { aiInteractiveResolver.current?.({ shooter, keeper }); aiInteractiveResolver.current = null; }} onStart={startAIDuel} onFinish={finishAIDuel} onSave={saveAIDuel} onPenaltyRoll={autoCompleteAIPenaltyShootout} onPenaltyManualRoll={() => { stopAIVoice(); setAiPenaltyDiceOpen(true); }} onPenaltyDiceClose={() => setAiPenaltyDiceOpen(false)} onPenaltyDiceComplete={(shooter, keeper) => { completeAIPenaltyKick(shooter, keeper); setAiPenaltyDiceOpen(false); }} onClose={() => { stopAIVoice(); spokenAIEventKeysRef.current = new Set(); aiHalftimeResolver.current?.(); aiInteractiveResolver.current?.(); aiHalftimeResolver.current = null; aiInteractiveResolver.current = null; setAiMatch(null); setAiSession(null); setAiRunning(false); setAiHalftimePaused(false); setAiInteractiveEvent(null); setAiPenaltyKicks([]); setAiPenaltyDiceOpen(false); }} />}
      <FloatingScrollToolbar onTop={scrollToPageTop} onBottom={scrollToPageBottom} onNextMatch={handleJumpToNextScheduledMatch} hasNextMatch={Boolean(nextScheduledMatch)} />
    </div>
  );
};

const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value: string; detail?: string }> = ({ icon, label, value, detail }) => <div className="bg-gray-50 p-4 rounded-lg"><div className="flex items-center gap-2">{icon}<span className="text-sm text-gray-600">{label}</span></div><p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>{detail && <p className="text-sm text-gray-600 mt-1">{detail}</p>}</div>;

const SyncRealResultModal: React.FC<{ result: SyncRealResult; onClose: () => void }> = ({ result, onClose }) => {
  const { language } = useI18n();
  const text = uiText(language);
  const unmatched = Array.isArray(result.unmatchedMatches) ? result.unmatchedMatches.slice(0, 8) : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{result.ok ? text.syncComplete : text.syncFailed}</h3>
            <p className={`mt-1 text-sm ${result.ok ? 'text-emerald-700' : 'text-red-700'}`}>
              {result.ok ? text.syncUpdated(result.updatedCount || 0) : result.error}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">{text.close}</button>
        </div>
        {result.ok && (
          <div className="space-y-3 text-sm text-gray-700">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded bg-gray-50 p-3"><div className="text-xs text-gray-500">{text.syncProvider}</div><div className="font-semibold">{result.provider || 'api-football'}</div></div>
              <div className="rounded bg-gray-50 p-3"><div className="text-xs text-gray-500">{text.syncFixtureCount}</div><div className="font-semibold">{result.fixtureCount || 0}</div></div>
              <div className="rounded bg-gray-50 p-3"><div className="text-xs text-gray-500">{text.syncCompletedFixtureCount}</div><div className="font-semibold">{result.completedFixtureCount || 0}</div></div>
              <div className="rounded bg-gray-50 p-3"><div className="text-xs text-gray-500">{text.syncLeague}</div><div className="font-semibold">{result.leagueId ? `${result.leagueName || 'World Cup'} #${result.leagueId}` : '-'}</div></div>
            </div>
            {Array.isArray(result.searchedLeagueIds) && result.searchedLeagueIds.length > 0 && (
              <div><div className="font-medium text-gray-900">{text.syncSearchedLeagueIds}</div><p className="mt-1 break-words">{result.searchedLeagueIds.join(', ')}</p></div>
            )}
            {unmatched.length > 0 && (
              <div><div className="font-medium text-gray-900">{text.syncUnmatched}</div><div className="mt-2 max-h-32 overflow-y-auto rounded bg-amber-50 p-3 text-amber-900">{unmatched.map(item => <div key={item}>{item}</div>)}</div></div>
            )}
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">{text.close}</button>
        </div>
      </div>
    </div>
  );
};

const FloatingScrollToolbar: React.FC<{ onTop: () => void; onBottom: () => void; onNextMatch: () => void; hasNextMatch: boolean }> = ({ onTop, onBottom, onNextMatch, hasNextMatch }) => (
  <FloatingScrollToolbarInner onTop={onTop} onBottom={onBottom} onNextMatch={onNextMatch} hasNextMatch={hasNextMatch} />
);

const FloatingScrollToolbarInner: React.FC<{ onTop: () => void; onBottom: () => void; onNextMatch: () => void; hasNextMatch: boolean }> = ({ onTop, onBottom, onNextMatch, hasNextMatch }) => {
  const { language } = useI18n();
  const text = uiText(language);
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2">
      <button type="button" onClick={onTop} className="rounded bg-gray-900 px-3 py-2 text-sm text-white shadow-lg hover:bg-gray-800">{text.top}</button>
      <button type="button" onClick={onBottom} className="rounded bg-gray-900 px-3 py-2 text-sm text-white shadow-lg hover:bg-gray-800">{text.bottom}</button>
      {hasNextMatch && <button type="button" onClick={onNextMatch} className="rounded bg-blue-600 px-3 py-2 text-sm text-white shadow-lg hover:bg-blue-700">{text.next}</button>}
    </div>
  );
};

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
  const { language } = useI18n();
  const text = uiText(language);
  const { left, right } = splitGroupEntries(groupedTeams);
  return (
    <section className="mb-8">
      <div className={`mb-4 rounded-lg border p-4 ${champion ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="text-sm font-medium text-gray-600">{text.champion}</div>
        <div className={`mt-1 text-2xl font-bold ${champion ? 'text-amber-800' : 'text-gray-500'}`}>{champion?.name || text.pending}</div>
      </div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{text.bracket}</h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-gray-500">{text.bracketHint}</span>
        </div>
      </div>
      <div className="border rounded-lg bg-slate-50 overflow-x-auto">
        <div className="min-w-[980px] p-4 grid gap-3 items-stretch" style={{ gridTemplateColumns: `180px repeat(${columns.left.length}, minmax(150px, 1fr)) minmax(170px, 1.1fr) repeat(${columns.right.length}, minmax(150px, 1fr)) 180px` }}>
          <BracketGroups title={text.leftGroups} entries={left} standings={standings} completedGroupNames={completedGroupNames} />
          {columns.left.map((column, index) => <BracketMatchColumn key={`left-${column.title}-${index}`} column={column} />)}
          <div className="flex flex-col justify-center">
            <div className="text-center text-sm font-semibold text-gray-700 mb-2">{text.final}</div>
            {columns.finalMatch ? <BracketMatchCard match={columns.finalMatch} prominent /> : <div className="border border-dashed rounded bg-white p-4 text-center text-sm text-gray-500">{text.finalPending}</div>}
          </div>
          {columns.right.map((column, index) => <BracketMatchColumn key={`right-${column.title}-${index}`} column={column} />)}
          <BracketGroups title={text.rightGroups} entries={right} standings={standings} completedGroupNames={completedGroupNames} />
        </div>
      </div>
    </section>
  );
};

const BracketGroups: React.FC<{ title: string; entries: Array<[string, Team[]]>; standings: Record<string, GroupStanding[]>; completedGroupNames: Set<string> }> = ({ title, entries, standings, completedGroupNames }) => {
  const { language } = useI18n();
  const text = uiText(language);
  return (
    <div>
      <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>
      <div className="space-y-2">
        {entries.map(([name, teams]) => (
          <div key={name} className="bg-white border rounded p-2">
            <div className="text-sm font-semibold text-gray-900 mb-1">{stageName(name, language)}</div>
            <div className="space-y-1">
              {teams.slice(0, 4).map(team => {
                const standingIndex = standings[name]?.findIndex(row => row.team.id === team.id) ?? -1;
                const qualified = completedGroupNames.has(name) && standingIndex >= 0 && standingIndex < 2;
                return <div key={team.id} className={`text-xs px-1 py-0.5 rounded flex items-center gap-1 min-w-0 ${qualified ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-700'}`}><TeamFlag team={team} className="w-4 h-3 flex-shrink-0" /><TeamLogo team={team} className="w-4 h-4 flex-shrink-0" /><span className="truncate">{getTeamDisplayName(team, language)}</span>{qualified && <span className="ml-1 text-[10px] flex-shrink-0">{text.qualified}</span>}</div>;
              })}
            </div>
          </div>
        ))}
        {entries.length === 0 && <div className="border border-dashed rounded bg-white p-3 text-sm text-gray-500">{text.noGroups}</div>}
      </div>
    </div>
  );
};

const BracketMatchColumn: React.FC<{ column: BracketColumn }> = ({ column }) => (
  <BracketMatchColumnInner column={column} />
);

const BracketMatchColumnInner: React.FC<{ column: BracketColumn }> = ({ column }) => {
  const { language } = useI18n();
  return (
    <div className="flex flex-col justify-center">
      <div className="text-center text-sm font-semibold text-gray-700 mb-2">{stageName(column.title, language)}</div>
      <div className="space-y-2">
        {column.matches.map(match => <BracketMatchCard key={match.id} match={match} />)}
      </div>
    </div>
  );
};

const BracketMatchCard: React.FC<{ match: Match; prominent?: boolean }> = ({ match, prominent = false }) => (
  <BracketMatchCardInner match={match} prominent={prominent} />
);

const BracketMatchCardInner: React.FC<{ match: Match; prominent?: boolean }> = ({ match, prominent = false }) => {
  const { language } = useI18n();
  const text = uiText(language);
  const scoreText = match.status !== 'completed'
    ? text.scheduled
    : `${match.homeScore ?? 0}-${match.awayScore ?? 0}${hasPenaltyResult(match) ? ` ${text.penalties} ${match.homePenaltyScore}-${match.awayPenaltyScore}` : ''}`;
  return (
    <div className={`bg-white border rounded p-2 ${prominent ? 'border-amber-400 bg-amber-50' : ''}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <TeamNameWithFlag team={match.homeTeam} fallback={text.teamPending} className="font-medium text-gray-900" flagClassName="w-4 h-3 flex-shrink-0" />
        <span className="text-gray-900 font-bold">{match.status === 'completed' ? match.homeScore ?? 0 : '-'}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs mt-1">
        <TeamNameWithFlag team={match.awayTeam} fallback={text.teamPending} className="font-medium text-gray-900" flagClassName="w-4 h-3 flex-shrink-0" />
        <span className="text-gray-900 font-bold">{match.status === 'completed' ? match.awayScore ?? 0 : '-'}</span>
      </div>
      <div className="mt-1 text-[10px] text-gray-500 truncate">{scoreText}</div>
    </div>
  );
};

const TeamGroup: React.FC<{ groupName: string; teams: Team[]; favoriteTeamIds: string[]; onToggleFavorite: (teamId: string) => void }> = ({ groupName, teams, favoriteTeamIds, onToggleFavorite }) => {
  const { language } = useI18n();
  return <div className="border rounded-lg p-4"><h4 className="font-semibold text-gray-900 mb-3">{stageName(groupName, language)}</h4><div className="space-y-2">{teams.map(team => <TeamCard key={team.id} team={team} isFavorite={favoriteTeamIds.includes(team.id)} onToggleFavorite={onToggleFavorite} compact />)}</div></div>;
};
const TeamCard: React.FC<{ team: Team; isFavorite: boolean; compact?: boolean; onToggleFavorite: (teamId: string) => void }> = ({ team, isFavorite, compact = false, onToggleFavorite }) => {
  const { language } = useI18n();
  return <div className={`border rounded-lg ${compact ? 'px-3 py-2' : 'p-4'} flex items-center justify-between`}><div className="min-w-0"><h4 className="font-semibold text-gray-900 flex items-center gap-2 min-w-0"><TeamFlag team={team} className="w-5 h-4 flex-shrink-0" /><TeamLogo team={team} className="w-5 h-5 flex-shrink-0" /><span className="truncate">{getTeamDisplayName(team, language)}</span></h4><p className="text-sm text-gray-600">{team.shortName}{team.country ? ` · ${team.country}` : ''}</p></div><button onClick={() => onToggleFavorite(team.id)} className={`p-2 rounded hover:bg-yellow-50 ${isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}><Star className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} /></button></div>;
};

const Standings: React.FC<{ standings: Record<string, GroupStanding[]>; completedGroupNames: Set<string> }> = ({ standings, completedGroupNames }) => {
  const { language } = useI18n();
  const text = uiText(language);
  return (
  <section className="mt-8">
    <h3 className="text-xl font-semibold text-gray-900 mb-4">{text.standings}</h3>
    <div className="grid xl:grid-cols-2 gap-4">
      {Object.entries(standings).sort(([a], [b]) => compareGroupNames(a, b)).map(([name, rows]) => {
        const groupCompleted = completedGroupNames.has(name);
        return (
          <div key={name} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-900">{stageName(name, language)}</div>
            <table className="min-w-full text-sm">
              <thead className="bg-white border-b">
                <tr className="text-gray-500">
                  <th className="px-3 py-2 text-left">{text.rank}</th>
                  <th className="px-3 py-2 text-left">{text.team}</th>
                  <th className="px-3 py-2 text-center">{text.played}</th>
                  <th className="px-3 py-2 text-center">{text.wins}</th>
                  <th className="px-3 py-2 text-center">{text.draws}</th>
                  <th className="px-3 py-2 text-center">{text.losses}</th>
                  <th className="px-3 py-2 text-center">{text.gf}</th>
                  <th className="px-3 py-2 text-center">{text.ga}</th>
                  <th className="px-3 py-2 text-center">{text.gd}</th>
                  <th className="px-3 py-2 text-center">{text.points}</th>
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
                          <span>{getTeamDisplayName(row.team, language)}</span>
                          {qualified && <span className="ml-1 text-xs text-green-700">{text.qualified}</span>}
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
};

const MatchToolbar: React.FC<{ query: string; onQueryChange: (value: string) => void; groupFilter: string; onGroupFilterChange: (value: string) => void; groupOptions: string[]; roundFilter: string; onRoundFilterChange: (value: string) => void; roundOptions: number[]; statusFilter: MatchStatusFilter; onStatusFilterChange: (value: MatchStatusFilter) => void; sortMode: MatchSortMode; onSortModeChange: (value: MatchSortMode) => void; onlyFavorites: boolean; onOnlyFavoritesChange: (value: boolean) => void; hasFavorites: boolean }> = ({ query, onQueryChange, groupFilter, onGroupFilterChange, groupOptions, roundFilter, onRoundFilterChange, roundOptions, statusFilter, onStatusFilterChange, sortMode, onSortModeChange, onlyFavorites, onOnlyFavoritesChange, hasFavorites }) => (
  <MatchToolbarInner query={query} onQueryChange={onQueryChange} groupFilter={groupFilter} onGroupFilterChange={onGroupFilterChange} groupOptions={groupOptions} roundFilter={roundFilter} onRoundFilterChange={onRoundFilterChange} roundOptions={roundOptions} statusFilter={statusFilter} onStatusFilterChange={onStatusFilterChange} sortMode={sortMode} onSortModeChange={onSortModeChange} onlyFavorites={onlyFavorites} onOnlyFavoritesChange={onOnlyFavoritesChange} hasFavorites={hasFavorites} />
);

const MatchToolbarInner: React.FC<{ query: string; onQueryChange: (value: string) => void; groupFilter: string; onGroupFilterChange: (value: string) => void; groupOptions: string[]; roundFilter: string; onRoundFilterChange: (value: string) => void; roundOptions: number[]; statusFilter: MatchStatusFilter; onStatusFilterChange: (value: MatchStatusFilter) => void; sortMode: MatchSortMode; onSortModeChange: (value: MatchSortMode) => void; onlyFavorites: boolean; onOnlyFavoritesChange: (value: boolean) => void; hasFavorites: boolean }> = ({ query, onQueryChange, groupFilter, onGroupFilterChange, groupOptions, roundFilter, onRoundFilterChange, roundOptions, statusFilter, onStatusFilterChange, sortMode, onSortModeChange, onlyFavorites, onOnlyFavoritesChange, hasFavorites }) => {
  const { language } = useI18n();
  const text = uiText(language);
  return (
    <div className="bg-gray-50 border rounded-lg p-4 mb-4">
      <div className="grid md:grid-cols-6 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} className="input pl-9" placeholder={text.searchTeam} />
        </div>
        <select value={groupFilter} onChange={(event) => onGroupFilterChange(event.target.value)} className="input">
          <option value="all">{text.allStages}</option>
          {groupOptions.map(name => <option key={name} value={name}>{stageName(name, language)}</option>)}
        </select>
        <select value={roundFilter} onChange={(event) => onRoundFilterChange(event.target.value)} className="input">
          <option value="all">{text.allRounds}</option>
          {roundOptions.map(round => <option key={round} value={round}>{text.round(round)}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as MatchStatusFilter)} className="input">
          <option value="all">{text.allStatuses}</option>
          <option value="scheduled">{text.scheduled}</option>
          <option value="completed">{text.completed}</option>
        </select>
        <select value={sortMode} onChange={(event) => onSortModeChange(event.target.value as MatchSortMode)} className="input">
          <option value="round-asc">{text.roundAsc}</option>
          <option value="round-desc">{text.roundDesc}</option>
          <option value="team-asc">{text.teamAsc}</option>
        </select>
      </div>
      <label className={`mt-3 inline-flex items-center gap-2 text-sm ${hasFavorites ? 'text-gray-700' : 'text-gray-400'}`}>
        <input type="checkbox" checked={onlyFavorites} disabled={!hasFavorites} onChange={(event) => onOnlyFavoritesChange(event.target.checked)} />
        {text.onlyFavorites}
      </label>
    </div>
  );
};

const MatchRow: React.FC<{ match: Match; favoriteTeamIds: string[]; startingMatch: string | null; onStart: (matchId: string) => void; onManualStart: (match: Match) => void; onAIStart: (match: Match) => void }> = ({ match, favoriteTeamIds, startingMatch, onStart, onManualStart, onAIStart }) => {
  const { language } = useI18n();
  const text = uiText(language);
  const homeFavorite = match.homeTeam && favoriteTeamIds.includes(match.homeTeam.id);
  const awayFavorite = match.awayTeam && favoriteTeamIds.includes(match.awayTeam.id);
  const statusText = match.status === 'scheduled' ? text.scheduled : match.status === 'in_progress' ? text.inProgress : text.completed;
  return <div id={`match-${match.id}`} className="scroll-mt-40 border rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white"><div className="flex-1 min-w-0"><h4 className="font-semibold mb-1 flex flex-wrap items-center gap-2 min-w-0"><TeamNameWithFlag team={match.homeTeam} fallback={match.homeTeam ? undefined : text.teamPending} className={`${homeFavorite ? 'text-yellow-700' : 'text-gray-900'} max-w-full sm:max-w-[45%]`} flagClassName="w-5 h-4 flex-shrink-0" /><span className="text-gray-400 flex-shrink-0">vs</span><TeamNameWithFlag team={match.awayTeam} fallback={match.awayTeam ? undefined : text.teamPending} className={`${awayFavorite ? 'text-yellow-700' : 'text-gray-900'} max-w-full sm:max-w-[45%]`} flagClassName="w-5 h-4 flex-shrink-0" /></h4><p className="text-sm text-gray-600">{text.round(match.round)} - {stageName(match.bracketStage || getMatchStageName(match, {}), language)} - {statusText}{match.resultMode === 'manual' && <span className="ml-2 inline-flex rounded bg-green-300 px-2 py-0.5 text-xs font-bold text-black">{text.godDice}</span>}{match.resultMode === 'ai' && <span className="ml-2 inline-flex rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">AI</span>}</p><p className="text-xs text-gray-500 mt-1">{match.scheduledAt ? formatMatchTime(match.scheduledAt) : text.timePending}{match.venue ? ` · ${match.venue}` : ''}</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">{match.status !== 'scheduled' && <span className="font-bold text-xl sm:text-right">{match.homeScore ?? 0} - {match.awayScore ?? 0}{hasPenaltyResult(match) && <span className="ml-2 text-sm text-gray-600">{text.penalties} {match.homePenaltyScore} - {match.awayPenaltyScore}</span>}</span>}<div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{match.status === 'scheduled' && match.homeTeam && match.awayTeam && <><button onClick={() => onStart(match.id)} disabled={startingMatch === match.id} className="inline-flex flex-1 justify-center whitespace-nowrap bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 sm:flex-none">{startingMatch === match.id ? text.startingOne : text.autoRun}</button><button onClick={() => onManualStart(match)} className="inline-flex flex-1 justify-center whitespace-nowrap bg-amber-600 text-white px-3 py-1 rounded text-sm hover:bg-amber-700 sm:flex-none">{text.dice}</button><button onClick={() => onAIStart(match)} className="inline-flex flex-1 justify-center whitespace-nowrap bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 sm:flex-none">{text.aiDuel}</button></>}<Link to={`/matches/${match.id}`} className="inline-flex flex-1 justify-center whitespace-nowrap bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 sm:flex-none">{match.status === 'scheduled' ? text.viewDetail : text.viewStats}</Link></div></div></div>;
};

const formationCoordinates: Record<string, Array<{ x: number; y: number }>> = {
  '4-3-3': [{ x: 50, y: 90 }, { x: 18, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 82, y: 72 }, { x: 50, y: 56 }, { x: 30, y: 48 }, { x: 70, y: 48 }, { x: 20, y: 24 }, { x: 50, y: 18 }, { x: 80, y: 24 }],
  '4-2-3-1': [{ x: 50, y: 90 }, { x: 18, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 82, y: 72 }, { x: 38, y: 56 }, { x: 62, y: 56 }, { x: 24, y: 36 }, { x: 50, y: 34 }, { x: 76, y: 36 }, { x: 50, y: 16 }],
  '4-4-2': [{ x: 50, y: 90 }, { x: 18, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 82, y: 72 }, { x: 20, y: 46 }, { x: 40, y: 48 }, { x: 60, y: 48 }, { x: 80, y: 46 }, { x: 40, y: 20 }, { x: 60, y: 20 }],
  '5-4-1': [{ x: 50, y: 90 }, { x: 12, y: 70 }, { x: 30, y: 75 }, { x: 50, y: 77 }, { x: 70, y: 75 }, { x: 88, y: 70 }, { x: 20, y: 46 }, { x: 40, y: 48 }, { x: 60, y: 48 }, { x: 80, y: 46 }, { x: 50, y: 18 }]
};

const FullFormationPitch: React.FC<{ homePlan?: any; awayPlan?: any; homeName?: string; awayName?: string }> = ({ homePlan, awayPlan, homeName, awayName }) => {
  const renderPlayers = (plan: any, side: 'home' | 'away') => {
    const lineup = plan?.lineup || [];
    const coords = formationCoordinates[plan?.formation] || formationCoordinates['4-4-2'];
    return lineup.map((player: any, index: number) => {
      const point = coords[index] || { x: 50, y: 50 };
      const left = side === 'home' ? 3 + (100 - point.y) * 0.44 : 97 - (100 - point.y) * 0.44;
      const top = point.x;
      return (
        <div key={`${side}-${player.number}-${index}`} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${left}%`, top: `${top}%` }}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow ${side === 'home' ? 'bg-blue-700' : 'bg-red-700'}`}>{player.number}</div>
          <div className="mt-1 max-w-[70px] truncate rounded bg-black/50 px-1 text-[10px] text-white">{player.position}</div>
        </div>
      );
    });
  };

  return (
    <div className="rounded border bg-gray-50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-blue-800">{homeName || '主队'} · {homePlan?.formation || '待入场'}</div>
        <div className="text-sm font-semibold text-red-800">{awayPlan?.formation || '待入场'} · {awayName || '客队'}</div>
      </div>
      <div className="relative aspect-[16/9] overflow-hidden rounded bg-emerald-700 shadow-inner">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.18) 0 1px, transparent 1px 12%)' }} />
        <div className="absolute inset-3 rounded border-2 border-white/75" />
        <div className="absolute left-1/2 top-3 bottom-3 w-0 border-l-2 border-white/65" />
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/65" />
        <div className="absolute left-3 top-1/2 h-36 w-20 -translate-y-1/2 border-2 border-l-0 border-white/65" />
        <div className="absolute right-3 top-1/2 h-36 w-20 -translate-y-1/2 border-2 border-r-0 border-white/65" />
        <div className="absolute left-3 top-1/2 h-20 w-9 -translate-y-1/2 border-2 border-l-0 border-white/55" />
        <div className="absolute right-3 top-1/2 h-20 w-9 -translate-y-1/2 border-2 border-r-0 border-white/55" />
        <div className="absolute left-[10%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white/70" />
        <div className="absolute right-[10%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white/70" />
        {homePlan ? renderPlayers(homePlan, 'home') : <div className="absolute left-1/4 top-1/2 -translate-x-1/2 rounded bg-black/40 px-3 py-2 text-sm text-white">主队正在通道候场</div>}
        {awayPlan ? renderPlayers(awayPlan, 'away') : <div className="absolute right-1/4 top-1/2 translate-x-1/2 rounded bg-black/40 px-3 py-2 text-sm text-white">客队正在通道候场</div>}
      </div>
    </div>
  );
};

const TacticsPanel: React.FC<{ plan?: any }> = ({ plan }) => (
  <div className="mt-3 rounded border bg-white p-3">
    <div className="text-sm font-semibold text-gray-900">战术设置板</div>
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-700">
      <div>心态：{plan?.tactics?.mentality || '教练组待定'}</div>
      <div>压迫：{plan?.tactics?.pressing || '-'}</div>
      <div>防线：{plan?.tactics?.defensiveLine || '-'}</div>
      <div>传球：{plan?.tactics?.passingStyle || '-'}</div>
      <div>宽度：{plan?.tactics?.attackingWidth || '-'}</div>
      <div className="text-gray-400">赛前战术待确认</div>
    </div>
  </div>
);

const PlanPanel: React.FC<{ title: string; plan?: any }> = ({ title, plan }) => (
  <div className="rounded border bg-gray-50 p-3">
    <div className="flex items-center justify-between gap-2">
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <span className="rounded bg-white px-2 py-1 text-sm text-gray-700">{plan?.formation || '待入场'}</span>
    </div>
    {plan ? <TacticsPanel plan={plan} /> : <p className="mt-3 text-sm text-gray-500">教练组正在提交赛前战术板。</p>}
  </div>
);

const LineupPanel: React.FC<{ homePlan?: any; awayPlan?: any; homeName?: string; awayName?: string }> = ({ homePlan, awayPlan, homeName, awayName }) => {
  const { language } = useI18n();
  const renderLineup = (plan: any, side: 'home' | 'away') => {
    const lineup = plan?.lineup || [];
    if (lineup.length === 0) {
      return <div className="rounded bg-gray-50 p-3 text-sm text-gray-500">待入场名单生成中</div>;
    }

    return (
      <div className="space-y-1.5">
        {lineup.map((player: any, index: number) => (
          <div key={`${side}-lineup-${player.number || index}-${player.name || index}`} className="flex items-center gap-2 rounded bg-white px-2 py-1.5 text-sm shadow-sm">
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${side === 'home' ? 'bg-blue-700' : 'bg-red-700'}`}>{player.number || index + 1}</span>
            <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{formatPlayerDisplayName(player, language, `球员 ${index + 1}`)}</span>
            <span className="flex-shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{player.position || '-'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="rounded border bg-gray-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900">球员名单</h3>
        <span className="rounded bg-white px-2 py-1 text-xs text-gray-600">首发 11 人</span>
      </div>
      <div className="space-y-4">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold text-blue-800">{homeName || '主队'}</div>
            <div className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-800">{homePlan?.formation || '待入场'}</div>
          </div>
          {renderLineup(homePlan, 'home')}
        </section>
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold text-red-800">{awayName || '客队'}</div>
            <div className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-800">{awayPlan?.formation || '待入场'}</div>
          </div>
          {renderLineup(awayPlan, 'away')}
        </section>
      </div>
    </div>
  );
};

const AIMatchModal: React.FC<{
  match: Match;
  session: AIMatchSession | null;
  duration: number;
  running: boolean;
  saving: boolean;
  finishing: boolean;
  voiceEnabled: boolean;
  autoShotResolution: boolean;
  halftimePaused: boolean;
  interactiveEvent: AIInteractiveEvent | null;
  penaltyKicks: PenaltyKick[];
  penaltyDiceOpen: boolean;
  isAdmin: boolean;
  onDurationChange: (value: number) => void;
  onVoiceChange: (value: boolean) => void;
  onAutoShotResolutionChange: (value: boolean) => void;
  onContinueSecondHalf: () => void;
  onInteractiveDiceClose: () => void;
  onInteractiveDiceComplete: (shooter: number, keeper: number) => void;
  onStart: () => void;
  onFinish: () => void;
  onSave: () => void;
  onPenaltyRoll: () => void;
  onPenaltyManualRoll: () => void;
  onPenaltyDiceClose: () => void;
  onPenaltyDiceComplete: (shooter: number, keeper: number) => void;
  onClose: () => void;
}> = ({ match, session, duration, running, saving, finishing, voiceEnabled, autoShotResolution, halftimePaused, interactiveEvent, penaltyKicks, penaltyDiceOpen, isAdmin, onDurationChange, onVoiceChange, onAutoShotResolutionChange, onContinueSecondHalf, onInteractiveDiceClose, onInteractiveDiceComplete, onStart, onFinish, onSave, onPenaltyRoll, onPenaltyManualRoll, onPenaltyDiceClose, onPenaltyDiceComplete, onClose }) => {
  const { language } = useI18n();
  const durations = [0.5, 1, 2, 4, 6, 8, 16, 20, 45, 90];
  const formatDurationOption = (value: number) => value < 1 ? '30秒' : `${value}分钟`;
  const finished = session?.status === 'finished';
  const needsPenalty = Boolean(finished && !match.groupName && session?.homeScore === session?.awayScore);
  const penaltyComplete = getPenaltyComplete(penaltyKicks);
  const commentaryEvents = [...(session?.events || [])].filter(event => !isPendingInteractiveAIEvent(event)).reverse();
  const latestCommentary = formatAIBroadcastText(commentaryEvents[0], session, language);
  const [displayMinute, setDisplayMinute] = useState(0);
  const [crowdEnabled, setCrowdEnabled] = useState(true);
  const [startOptionsOpen, setStartOptionsOpen] = useState(false);
  const [goalFlash, setGoalFlash] = useState(false);
  const [goalNotice, setGoalNotice] = useState<{ teamName: string; score: string } | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const clockStartedAt = useRef<number>();
  const previousScoreRef = useRef('0-0');
  const previousCrowdEventCountRef = useRef(0);
  const crowdAudioRef = useRef<{ context: AudioContext; source: AudioBufferSourceNode; gain: GainNode }>();

  useEffect(() => {
    if (!session) {
      clockStartedAt.current = undefined;
      setDisplayMinute(0);
      return;
    }

    if (halftimePaused) {
      clockStartedAt.current = undefined;
      setDisplayMinute(45);
      return;
    }

    if (finished) {
      setDisplayMinute(AI_MATCH_TOTAL_MINUTES);
      return;
    }

    if (!running) {
      clockStartedAt.current = undefined;
      setDisplayMinute(Math.max(displayMinute, session.currentMinute));
      return;
    }

    if (!clockStartedAt.current) {
      const baseMinute = session.currentMinute >= 45 ? 45 : 0;
      const phaseMinute = Math.max(baseMinute, Math.min(session.currentMinute, AI_MATCH_TOTAL_MINUTES));
      const phaseDurationMs = (duration * 60 * 1000) / 2;
      const phaseProgress = Math.max(0, Math.min(45, phaseMinute - baseMinute)) / 45;
      clockStartedAt.current = Date.now() - phaseProgress * phaseDurationMs;
    }

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - (clockStartedAt.current || Date.now());
      const baseMinute = session.currentMinute >= 45 ? 45 : 0;
      const phaseDurationMs = (duration * 60 * 1000) / 2;
      const nextMinute = Math.min(baseMinute + 45, baseMinute + (elapsed / phaseDurationMs) * 45);
      const floorMinute = baseMinute === 0 ? Math.min(session.currentMinute, 45) : session.currentMinute;
      setDisplayMinute(Math.min(baseMinute + 45, Math.max(nextMinute, floorMinute)));
    }, 250);

    return () => window.clearInterval(timer);
  }, [duration, finished, halftimePaused, running, session]);

  useEffect(() => {
    const currentScore = `${session?.homeScore ?? 0}-${session?.awayScore ?? 0}`;
    if (!session) {
      previousScoreRef.current = currentScore;
      previousCrowdEventCountRef.current = 0;
      setGoalFlash(false);
      setGoalNotice(null);
      return;
    }
    if (previousScoreRef.current !== currentScore) {
      const [previousHome, previousAway] = previousScoreRef.current.split('-').map(value => Number(value) || 0);
      const scoringTeamName = (session.homeScore || 0) > previousHome
        ? match.homeTeam?.name || '主队'
        : (session.awayScore || 0) > previousAway
          ? match.awayTeam?.name || '客队'
          : '进攻方';
      previousScoreRef.current = currentScore;
      setGoalFlash(true);
      setGoalNotice({ teamName: scoringTeamName, score: currentScore });
      if (crowdAudioRef.current) {
        const now = crowdAudioRef.current.context.currentTime;
        crowdAudioRef.current.gain.gain.cancelScheduledValues(now);
        crowdAudioRef.current.gain.gain.setValueAtTime(crowdAudioRef.current.gain.gain.value, now);
        crowdAudioRef.current.gain.gain.linearRampToValueAtTime(0.24, now + 0.15);
        crowdAudioRef.current.gain.gain.linearRampToValueAtTime(0.075, now + 3.4);
      }
      const timer = window.setTimeout(() => {
        setGoalFlash(false);
        setGoalNotice(null);
      }, 3600);
      return () => window.clearTimeout(timer);
    }
  }, [match.awayTeam?.name, match.homeTeam?.name, session?.homeScore, session?.awayScore, session?.id]);

  useEffect(() => {
    if (!session || !crowdAudioRef.current) return;
    const events = session.events || [];
    const newEvents = events.slice(previousCrowdEventCountRef.current);
    previousCrowdEventCountRef.current = events.length;
    const urgent = newEvents.find(isUrgentAIEvent);
    if (!urgent || urgent.type === 'goal') return;
    const now = crowdAudioRef.current.context.currentTime;
    const peak = urgent.type === 'penalty' ? 0.18 : 0.14;
    crowdAudioRef.current.gain.gain.cancelScheduledValues(now);
    crowdAudioRef.current.gain.gain.setValueAtTime(crowdAudioRef.current.gain.gain.value, now);
    crowdAudioRef.current.gain.gain.linearRampToValueAtTime(peak, now + 0.12);
    crowdAudioRef.current.gain.gain.linearRampToValueAtTime(0.075, now + 2.2);
  }, [session?.events]);

  useEffect(() => {
    const keepCrowdAlive = running || halftimePaused || Boolean(interactiveEvent) || penaltyDiceOpen;
    if (!crowdEnabled || !keepCrowdAlive) {
      if (crowdAudioRef.current) {
        crowdAudioRef.current.source.stop();
        crowdAudioRef.current.context.close();
        crowdAudioRef.current = undefined;
      }
      return;
    }
    if (crowdAudioRef.current) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    void context.resume();
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * 0.28;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const swell = context.createOscillator();
    const swellGain = context.createGain();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    swell.type = 'sine';
    swell.frequency.value = 96;
    swellGain.gain.value = 0.018;
    gain.gain.value = 0.075;
    source.connect(filter);
    filter.connect(gain);
    swell.connect(swellGain);
    swellGain.connect(gain);
    gain.connect(context.destination);
    source.start();
    swell.start();
    crowdAudioRef.current = { context, source, gain };
    return () => {
      if (crowdAudioRef.current) {
        crowdAudioRef.current.source.stop();
        crowdAudioRef.current.context.close();
        crowdAudioRef.current = undefined;
      }
    };
  }, [crowdEnabled, halftimePaused, interactiveEvent, penaltyDiceOpen, running]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI 对决</h2>
            <p className="mt-1 text-sm text-gray-600">{match.homeTeam?.name} vs {match.awayTeam?.name}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => setStartOptionsOpen(true)} disabled={running || !!session} className="rounded bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50">{running ? 'AI 对决中...' : '开始 AI 对决'}</button>
            {halftimePaused && <button onClick={onContinueSecondHalf} className="rounded bg-amber-700 px-3 py-2 text-sm text-white hover:bg-amber-800">下半场开始</button>}
            <button onClick={onFinish} disabled={finishing || session?.status === 'finished'} className="rounded bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-900 disabled:opacity-50">{finishing ? '结算中...' : '快速完成'}</button>
            <button onClick={onSave} disabled={!finished || saving || (needsPenalty && !penaltyComplete)} className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">{saving ? '保存中...' : needsPenalty && !penaltyComplete ? '先点球' : finished ? '保存结果并关闭' : '保存结果'}</button>
            {isAdmin && <button onClick={() => setDebugOpen(open => !open)} className="rounded bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700">DEBUG</button>}
            {!finished && <button onClick={onClose} disabled={running} className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50">关闭</button>}
          </div>
        </div>

        <div className={`mt-4 rounded-lg border px-4 py-3 text-gray-900 shadow-sm transition-all ${goalFlash ? 'goal-scoreboard-blast' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3">
            <div className="flex min-w-0 items-center justify-end gap-2 text-right text-sm font-semibold sm:text-base">
              <TeamFlag team={match.homeTeam} className="h-4 w-6 flex-shrink-0" />
              <span className="truncate">{match.homeTeam?.name || '主队'}</span>
            </div>
            <div className="rounded border border-emerald-200 bg-white px-4 py-2 text-2xl font-bold tabular-nums text-gray-950 shadow-sm">{session?.homeScore ?? 0} - {session?.awayScore ?? 0}</div>
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold sm:text-base">
              <span className="truncate">{match.awayTeam?.name || '客队'}</span>
              <TeamFlag team={match.awayTeam} className="h-4 w-6 flex-shrink-0" />
            </div>
            <div className="rounded bg-emerald-700 px-3 py-2 text-xl font-bold tabular-nums text-white">{formatAIMatchClock(displayMinute)}</div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded bg-emerald-100">
            <div className="h-full rounded bg-emerald-600 transition-all" style={{ width: `${Math.min(100, (displayMinute / AI_MATCH_TOTAL_MINUTES) * 100)}%` }} />
          </div>
        </div>
        <div className="mt-2 rounded-lg border border-emerald-100 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm">
          {halftimePaused ? '球员回到更衣室，解说席稍作调整。' : latestCommentary || '解说席正在连线，等待开球哨响。'}
        </div>
        {goalNotice && (
          <div className="mt-3 rounded-lg border-2 border-yellow-300 bg-gradient-to-r from-yellow-300 via-red-500 to-pink-600 px-5 py-4 text-white shadow-lg goal-scoreboard-blast">
            <div className="text-xs font-bold uppercase tracking-widest">GOAL</div>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div className="text-2xl font-black">进球啦！{goalNotice.teamName}</div>
              <div className="rounded bg-black/25 px-3 py-1 text-2xl font-black tabular-nums">{goalNotice.score}</div>
            </div>
          </div>
        )}
        {isAdmin && debugOpen && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">赛前 DEBUG</h3>
              <span className="rounded bg-white px-2 py-1 text-xs">仅 admin 可见</span>
            </div>
            {session?.engineState ? (
              <>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <div className="rounded bg-white p-2">预设进球预算：{session.engineState.goalBudget ?? '-'}</div>
                  <div className="rounded bg-white p-2">已发生进球：{session.engineState.usedGoalBudget ?? 0}</div>
                  <div className="rounded bg-white p-2">大机会预算：{session.engineState.bigChanceBudget ?? '-'}</div>
                  <div className="rounded bg-white p-2">已发生大机会：{session.engineState.usedBigChanceBudget ?? 0}</div>
                </div>
                <div className="mt-3 max-h-44 overflow-y-auto rounded bg-white p-2">
                  {(session.engineState.pendingEvents || []).length === 0 && <div className="text-rose-700">暂无未来事件。</div>}
                  {(session.engineState.pendingEvents || []).map((event: any) => (
                    <div key={event.id} className={`border-b py-1 last:border-b-0 ${event.consumed ? 'text-gray-400 line-through' : ''}`}>
                      {event.minute}' · {event.team === 'home' ? match.homeTeam?.name : match.awayTeam?.name} · {event.type} · 发生率 {Math.round((event.probability || 0) * 100)}% · {event.reason}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-3 rounded bg-white p-3 text-rose-700">开始 AI 对决后会生成赛前比分预算和未来事件。</div>
            )}
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-4">
            <LineupPanel homePlan={session?.homePlan} awayPlan={session?.awayPlan} homeName={match.homeTeam?.name} awayName={match.awayTeam?.name} />
          </div>

          <div className="space-y-4">
            <FullFormationPitch homePlan={session?.homePlan} awayPlan={session?.awayPlan} homeName={match.homeTeam?.name} awayName={match.awayTeam?.name} />
            <div className="grid gap-3 md:grid-cols-2">
              <PlanPanel title={`${match.homeTeam?.name || '主队'} 战术`} plan={session?.homePlan} />
              <PlanPanel title={`${match.awayTeam?.name || '客队'} 战术`} plan={session?.awayPlan} />
            </div>
            <div className="rounded border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center justify-between gap-4 text-sm text-blue-950">
                <span>
                  <span className="font-semibold">自动判定射门</span>
                  <span className="ml-2 text-blue-800">开启后不弹出“上帝正在掷射门骰子”，系统自动掷骰并继续比赛。</span>
                </span>
                <button type="button" role="switch" aria-checked={autoShotResolution} onClick={() => onAutoShotResolutionChange(!autoShotResolution)} className={`relative inline-flex h-8 w-16 flex-shrink-0 items-center rounded-full p-1 transition-colors ${autoShotResolution ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${autoShotResolution ? 'translate-x-8' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="rounded border p-4">
              <h3 className="font-semibold text-gray-900">广播解说</h3>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {commentaryEvents.length === 0 && <div className="rounded bg-gray-50 p-4 text-sm text-gray-500">解说席正在连线，等待开球哨响。</div>}
                {commentaryEvents.map((event, index) => (
                  <div key={`${event.minute}-${index}`} className={`rounded p-3 text-sm ${event.type === 'goal' ? 'bg-amber-50 text-amber-900' : 'bg-gray-50 text-gray-700'}`}>
                    <span className="font-semibold">{event.minute}'</span> {formatAIBroadcastText(event, session, language)}
                  </div>
                ))}
              </div>
            </div>
            {interactiveEvent && (
              <div className="rounded border border-purple-200 bg-purple-50 p-4">
                <h3 className="font-semibold text-purple-900">关键射门判定</h3>
                <p className="mt-1 text-sm text-purple-800">{interactiveEvent.minute}' {interactiveEvent.text}</p>
                <p className="mt-1 text-xs text-purple-700">上帝摇骰子后，结果会反馈给 AI 解说继续比赛。</p>
              </div>
            )}
            {needsPenalty && <PenaltyShootoutPanel match={match} kicks={penaltyKicks} complete={penaltyComplete} submitting={saving} saved={false} onRoll={onPenaltyRoll} onManualRoll={onPenaltyManualRoll} />}
            {penaltyDiceOpen && <PenaltyDiceModal title="AI 对决点球大战，上帝摇骰子决定射门和扑救。" onClose={onPenaltyDiceClose} onComplete={onPenaltyDiceComplete} />}
            {interactiveEvent && <PenaltyDiceModal title="关键射门，上帝摇骰子决定射门与扑救。" description={`${interactiveEvent.minute}' ${interactiveEvent.text}`} onClose={onInteractiveDiceClose} onComplete={onInteractiveDiceComplete} />}
            {session?.statistics && (
              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <InfoCard icon={null} label="主队射门" value={String(session.statistics.homeShots || 0)} />
                <InfoCard icon={null} label="客队射门" value={String(session.statistics.awayShots || 0)} />
                <InfoCard icon={null} label="主队角球" value={String(session.statistics.homeCorners || 0)} />
                <InfoCard icon={null} label="客队角球" value={String(session.statistics.awayCorners || 0)} />
              </div>
            )}
            <div className="rounded border bg-gray-50 p-4">
              <h3 className="font-semibold text-gray-900">转播设置</h3>
              <div className="mt-3 grid gap-3 text-sm text-gray-700 md:grid-cols-3">
                <div className="rounded bg-white p-3">压缩播放：{formatDurationOption(duration)}</div>
                <label className="flex items-center gap-2 rounded bg-white p-3">
                  <input type="checkbox" checked={voiceEnabled} onChange={event => onVoiceChange(event.target.checked)} />
                  广播语音播报
                </label>
                <label className="flex items-center gap-2 rounded bg-white p-3">
                  <input type="checkbox" checked={crowdEnabled} onChange={event => setCrowdEnabled(event.target.checked)} />
                  观众背景音
                </label>
              </div>
            </div>
          </div>
        </div>
        {startOptionsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900">赛前转播设置</h3>
              <p className="mt-1 text-sm text-gray-600">实际比赛为 90 分钟，选择压缩播放用时。</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {durations.map(item => <button key={item} onClick={() => onDurationChange(item)} className={`rounded px-3 py-2 text-sm ${duration === item ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{formatDurationOption(item)}</button>)}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setStartOptionsOpen(false)} className="rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">取消</button>
                <button onClick={() => { setStartOptionsOpen(false); onStart(); }} className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">开球</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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

const PenaltyDiceModal: React.FC<{ title: string; description?: string; onClose: () => void; onComplete: (shooter: number, keeper: number) => void }> = ({ title, description, onClose, onComplete }) => {
  const { language } = useI18n();
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

  const speakDiceCommentary = async (data: { phase: 'intro' | 'shoot' | 'save' | 'result'; shooter?: number; keeper?: number }) => {
    if (!('speechSynthesis' in window)) return;
    try {
      const response = await llmAPI.diceCommentary({ ...data, language });
      const text = response.data?.text;
      if (!response.data?.enabled || !text) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'en' ? 'en-US' : 'zh-CN';
      utterance.rate = 1.28;
      utterance.pitch = 1.2;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // LLM commentary is optional for this shared dice dialog.
    }
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  useEffect(() => () => clearTimer(), []);
  useEffect(() => {
    void speakDiceCommentary({ phase: 'intro' });
  }, []);

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
          void speakDiceCommentary({ phase: 'shoot', shooter: die });
        } else {
          setSaveValues(current => current.map((value, valueIndex) => valueIndex === target ? die : value));
          setKeeperDie(die);
          setSaveSelectedIndex(target);
          const currentShooter = shooterDie;
          void speakDiceCommentary({ phase: 'result', shooter: currentShooter, keeper: die });
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
            <h3 className="text-xl font-bold text-gray-900">{title.includes('点球') ? '上帝正在掷点球骰子' : '上帝正在掷射门骰子'}</h3>
            <p className="text-sm text-gray-600">{title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={rolling} className="text-gray-500 hover:text-gray-800 disabled:opacity-50">关闭</button>
        </div>
        {description && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="font-semibold">射门判定开始</div>
            <p className="mt-1 leading-6">{description}</p>
            <p className="mt-2 text-xs text-amber-800">先点击“射门”决定这脚打门质量，再点击“扑救”决定门将反应。</p>
          </div>
        )}
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
