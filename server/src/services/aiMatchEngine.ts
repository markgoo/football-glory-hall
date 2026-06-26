import { Match } from '../models/Match';
import { Team } from '../models/Team';

export type AISide = 'home' | 'away';

export type AIMatchEngineEvent = {
  minute: number;
  type: 'commentary' | 'chance' | 'save' | 'goal' | 'card' | 'injury' | 'penalty';
  team: AISide | 'neutral';
  key: boolean;
  player?: string;
  text: string;
  engine?: boolean;
};

export type AIMatchPendingEvent = {
  id: string;
  minute: number;
  type: 'chance' | 'goal' | 'card' | 'injury' | 'penalty';
  team: AISide;
  probability: number;
  volatility: number;
  reason: string;
  consumed?: boolean;
};

export type AIMatchEngineState = {
  version: 1;
  matchTotalMinutes: number;
  segmentMinutes: number;
  goalBudget: number;
  usedGoalBudget: number;
  bigChanceBudget: number;
  usedBigChanceBudget: number;
  momentum: Record<AISide, number>;
  fatigue: Record<AISide, number>;
  tacticsHistory: Array<{ minute: number; home: any; away: any }>;
  stamina: Record<AISide, Record<string, number>>;
  pendingEvents: AIMatchPendingEvent[];
};

export type AIMatchEngineResult = {
  nextMinute: number;
  scoreDelta: Record<AISide, number>;
  statisticsDelta: Record<string, number>;
  events: AIMatchEngineEvent[];
  engineState: AIMatchEngineState;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const chance = (probability: number) => Math.random() < probability;
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const teamOverall = (team?: Team) => team?.stats?.overall || 80;
const teamAttack = (team?: Team) => team?.stats?.attack || teamOverall(team);
const teamDefense = (team?: Team) => team?.stats?.defense || teamOverall(team);
const teamMidfield = (team?: Team) => team?.stats?.midfield || teamOverall(team);

const lineupPlayer = (plan: any, fallback: string, attacking = true) => {
  const lineup: any[] = Array.isArray(plan?.lineup) ? plan.lineup : [];
  if (lineup.length === 0) return fallback;
  const candidates = attacking ? lineup.slice(7) : lineup.slice(0, 5);
  return pick(candidates.length ? candidates : lineup)?.name || fallback;
};

const tacticRisk = (plan: any) => {
  const mentality = String(plan?.tactics?.mentality || '');
  if (/全力|主动|进攻|控球/.test(mentality)) return 0.12;
  if (/稳守|反击|防守/.test(mentality)) return -0.06;
  return 0;
};

const eventId = () => Math.random().toString(36).slice(2, 10);

const createPendingEvents = (params: {
  fromMinute: number;
  homeTeam: Team;
  awayTeam: Team;
  homePlan: any;
  awayPlan: any;
  goalBudget: number;
  bigChanceBudget: number;
}) => {
  const events: AIMatchPendingEvent[] = [];
  const homeBias = clamp((teamAttack(params.homeTeam) - teamDefense(params.awayTeam)) / 80 + tacticRisk(params.homePlan), -0.2, 0.2);
  const scheduledMinutes = [12, 19, 27, 34, 43, 52, 61, 68, 76, 84].filter(minute => minute > params.fromMinute);
  scheduledMinutes.slice(0, params.bigChanceBudget).forEach((minute, index) => {
    const team: AISide = Math.random() < 0.5 + homeBias ? 'home' : 'away';
    const type = index < params.goalBudget && chance(0.35) ? 'goal' : 'chance';
    events.push({
      id: eventId(),
      minute,
      type,
      team,
      probability: type === 'goal' ? 0.32 : 0.58,
      volatility: 0.18,
      reason: type === 'goal' ? '赛前推演中的高质量机会' : '赛前推演中的进攻窗口'
    });
  });
  if (chance(0.28)) events.push({ id: eventId(), minute: pick([38, 55, 67, 78]), type: 'card', team: chance(0.5) ? 'home' : 'away', probability: 0.45, volatility: 0.22, reason: '高强度对抗风险' });
  if (chance(0.12)) events.push({ id: eventId(), minute: pick([49, 63, 72, 81]), type: 'penalty', team: chance(0.5) ? 'home' : 'away', probability: 0.22, volatility: 0.25, reason: '禁区内高风险对抗' });
  return events.sort((a, b) => a.minute - b.minute);
};

export class AIMatchEngine {
  static createInitialState(homeTeam: Team, awayTeam: Team, homePlan: any, awayPlan: any): AIMatchEngineState {
    const strengthGap = Math.abs(teamOverall(homeTeam) - teamOverall(awayTeam));
    const baseBudget = strengthGap >= 15 ? 5 : strengthGap >= 8 ? 4 : 3;
    const goalBudget = clamp(baseBudget + (chance(0.18) ? 1 : 0) - (chance(0.12) ? 1 : 0), 1, 6);
    return {
      version: 1,
      matchTotalMinutes: 90,
      segmentMinutes: 5,
      goalBudget,
      usedGoalBudget: 0,
      bigChanceBudget: clamp(goalBudget + 2 + Math.floor(Math.random() * 3), 3, 8),
      usedBigChanceBudget: 0,
      momentum: { home: 0, away: 0 },
      fatigue: { home: 0, away: 0 },
      tacticsHistory: [{ minute: 0, home: homePlan?.tactics || {}, away: awayPlan?.tactics || {} }],
      stamina: {
        home: Object.fromEntries((homePlan?.lineup || []).map((player: any) => [String(player.number), 100])),
        away: Object.fromEntries((awayPlan?.lineup || []).map((player: any) => [String(player.number), 100]))
      },
      pendingEvents: createPendingEvents({ fromMinute: 0, homeTeam, awayTeam, homePlan, awayPlan, goalBudget, bigChanceBudget: clamp(goalBudget + 2 + Math.floor(Math.random() * 3), 3, 8) })
    };
  }

  static simulateSegment(input: {
    match: Match;
    state: AIMatchEngineState;
    currentMinute: number;
    homeScore: number;
    awayScore: number;
    homePlan: any;
    awayPlan: any;
  }): AIMatchEngineResult {
    const state = { ...input.state, momentum: { ...input.state.momentum }, fatigue: { ...input.state.fatigue } };
    const nextMinute = Math.min(state.matchTotalMinutes, input.currentMinute + state.segmentMinutes);
    const remainingBudget = Math.max(0, state.goalBudget - state.usedGoalBudget);

    const homePower = teamAttack(input.match.homeTeam) * 0.45 + teamMidfield(input.match.homeTeam) * 0.35 - teamDefense(input.match.awayTeam) * 0.25 + state.momentum.home - state.fatigue.home + tacticRisk(input.homePlan) * 20;
    const awayPower = teamAttack(input.match.awayTeam) * 0.45 + teamMidfield(input.match.awayTeam) * 0.35 - teamDefense(input.match.homeTeam) * 0.25 + state.momentum.away - state.fatigue.away + tacticRisk(input.awayPlan) * 20;
    const totalPower = Math.max(1, homePower + awayPower);
    const homeShare = clamp(homePower / totalPower, 0.28, 0.72);
    const segmentIntensity = input.currentMinute >= 75 ? 1.15 : input.currentMinute < 15 ? 0.85 : 1;
    const bigChanceProbability = remainingBudget > 0 && state.usedBigChanceBudget < state.bigChanceBudget
      ? clamp(0.18 * segmentIntensity + Math.abs(homePower - awayPower) / 450, 0.08, 0.34)
      : 0;

    const duePendingEvents = (state.pendingEvents || []).filter(event => !event.consumed && event.minute > input.currentMinute && event.minute <= nextMinute);
    const selectedPendingEvent = duePendingEvents.find(event => chance(clamp(event.probability + (event.team === 'home' ? homeShare - 0.5 : 0.5 - homeShare), 0.05, 0.9)));
    const attackingSide: AISide = selectedPendingEvent?.team || (Math.random() < homeShare ? 'home' : 'away');
    const defendingSide: AISide = attackingSide === 'home' ? 'away' : 'home';
    const attackingPlan = attackingSide === 'home' ? input.homePlan : input.awayPlan;
    const attackingTeam = attackingSide === 'home' ? input.match.homeTeam : input.match.awayTeam;

    const scoreDelta = { home: 0, away: 0 };
    const events: AIMatchEngineEvent[] = [];
    const stats = {
      homeShots: 0,
      awayShots: 0,
      homeShotsOnTarget: 0,
      awayShotsOnTarget: 0,
      homeCorners: 0,
      awayCorners: 0,
      homeFouls: Math.floor(Math.random() * 2),
      awayFouls: Math.floor(Math.random() * 2)
    };

    const minuteA = Math.min(nextMinute, input.currentMinute + 2);
    const minuteB = selectedPendingEvent?.minute || Math.min(nextMinute, input.currentMinute + 4);
    if (selectedPendingEvent) {
      state.pendingEvents = state.pendingEvents.map(event => event.id === selectedPendingEvent.id ? { ...event, consumed: true } : event);
    }
    events.push({
      minute: minuteA,
      type: 'commentary',
      team: attackingSide,
      key: false,
      text: `${attackingTeam?.name || '进攻方'} 开始提速，试图从中路和边路之间找到空当。`,
      engine: true
    });

    stats[`${attackingSide}Shots` as 'homeShots' | 'awayShots'] += chance(0.58) ? 1 : 0;

    if (selectedPendingEvent || chance(bigChanceProbability)) {
      state.usedBigChanceBudget += 1;
      stats[`${attackingSide}Shots` as 'homeShots' | 'awayShots'] += 1;
      stats[`${attackingSide}ShotsOnTarget` as 'homeShotsOnTarget' | 'awayShotsOnTarget'] += 1;
      const canScore = selectedPendingEvent?.type === 'goal' || (remainingBudget > 0
        && Math.abs((attackingSide === 'home' ? input.homeScore - input.awayScore : input.awayScore - input.homeScore)) < 4
        && chance(clamp(0.22 + (attackingSide === 'home' ? homePower - awayPower : awayPower - homePower) / 350, 0.12, 0.42)));
      const player = lineupPlayer(attackingPlan, attackingTeam?.name || '射手');
      if (canScore && remainingBudget > 0) {
        scoreDelta[attackingSide] = 1;
        state.usedGoalBudget += 1;
        state.momentum[attackingSide] += 1.2;
        state.momentum[defendingSide] -= 0.8;
        events.push({ minute: minuteB, type: 'goal', team: attackingSide, key: true, player, text: `${player} 抓住关键机会完成破门。`, engine: true });
      } else if (selectedPendingEvent?.type === 'card') {
        events.push({ minute: minuteB, type: 'card', team: attackingSide, key: true, text: `${attackingTeam?.name || '球队'} 在高强度对抗中吃到一张黄牌。`, engine: true });
      } else if (selectedPendingEvent?.type === 'penalty') {
        events.push({ minute: minuteB, type: 'penalty', team: attackingSide, key: true, player: lineupPlayer(attackingPlan, attackingTeam?.name || '主罚手'), text: `${attackingTeam?.name || '进攻方'} 制造点球机会，裁判指向十二码点。`, engine: true });
      } else {
        state.momentum[attackingSide] += 0.4;
        events.push({ minute: minuteB, type: 'chance', team: attackingSide, key: true, player, text: `${player} 得到一次绝佳射门机会，门前气氛瞬间紧张。`, engine: true });
      }
    } else {
      const sideName = attackingTeam?.name || '进攻方';
      if (chance(0.3)) stats[`${attackingSide}Corners` as 'homeCorners' | 'awayCorners'] += 1;
      events.push({
        minute: minuteB,
        type: 'commentary',
        team: 'neutral',
        key: false,
        text: `${sideName} 的推进被防线延缓，比赛重新回到中场争夺。`,
        engine: true
      });
    }

    state.fatigue.home = clamp(state.fatigue.home + 0.35 + Math.max(0, tacticRisk(input.homePlan) * 1.8), 0, 25);
    state.fatigue.away = clamp(state.fatigue.away + 0.35 + Math.max(0, tacticRisk(input.awayPlan) * 1.8), 0, 25);
    state.momentum.home = clamp(state.momentum.home * 0.86, -8, 8);
    state.momentum.away = clamp(state.momentum.away * 0.86, -8, 8);

    return {
      nextMinute,
      scoreDelta,
      statisticsDelta: stats,
      events,
      engineState: state
    };
  }

  static applyManualFeedback(state: AIMatchEngineState, eventType: string) {
    const next = { ...state };
    if (eventType === 'goal') next.usedGoalBudget = Math.min(next.goalBudget, next.usedGoalBudget + 1);
    next.usedBigChanceBudget = Math.min(next.bigChanceBudget, next.usedBigChanceBudget + 1);
    return next;
  }

  static resetPendingEventsAfterTacticsChange(input: {
    state: AIMatchEngineState;
    minute: number;
    homeTeam: Team;
    awayTeam: Team;
    homePlan: any;
    awayPlan: any;
  }) {
    const remainingGoalBudget = Math.max(1, input.state.goalBudget - input.state.usedGoalBudget);
    const remainingChanceBudget = Math.max(2, input.state.bigChanceBudget - input.state.usedBigChanceBudget);
    return {
      ...input.state,
      tacticsHistory: [...input.state.tacticsHistory, { minute: input.minute, home: input.homePlan?.tactics || {}, away: input.awayPlan?.tactics || {} }],
      pendingEvents: [
        ...(input.state.pendingEvents || []).filter(event => event.consumed || event.minute <= input.minute),
        ...createPendingEvents({
          fromMinute: input.minute,
          homeTeam: input.homeTeam,
          awayTeam: input.awayTeam,
          homePlan: input.homePlan,
          awayPlan: input.awayPlan,
          goalBudget: remainingGoalBudget,
          bigChanceBudget: remainingChanceBudget
        })
      ].sort((a, b) => a.minute - b.minute)
    };
  }
}
