import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { LLMSetting } from '../models/LLMSetting';
import { LLMPromptTemplate, LLMPromptTemplateKey } from '../models/LLMPromptTemplate';
import { AIMatchSession } from '../models/AIMatchSession';
import { Match } from '../models/Match';
import { Team, TeamPlayer } from '../models/Team';
import { AIMatchEngine } from '../services/aiMatchEngine';

const ENCRYPTION_PREFIX = 'enc:v1:';
const PROMPT_KEYS: LLMPromptTemplateKey[] = ['match_intro', 'match_step', 'match_summary'];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getEncryptionKey = () => {
  const secret = process.env.LLM_SECRET || process.env.JWT_SECRET || 'football-glory-hall-local-secret';
  return crypto.createHash('sha256').update(secret).digest();
};

const encrypt = (value: string) => {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

const decrypt = (value: string) => {
  if (!value) return '';
  if (!value.startsWith(ENCRYPTION_PREFIX)) return value;
  const [ivText, tagText, encryptedText] = value.slice(ENCRYPTION_PREFIX.length).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8');
};

const getEffectiveLLMSetting = async (userId: string) => {
  const repository = AppDataSource.getRepository(LLMSetting);
  const personal = await repository.findOne({ where: { user: { id: userId }, isGlobal: false } });
  if (personal?.apiKey) return { setting: personal, source: 'personal' as const };

  const global = await repository.findOne({ where: { isGlobal: true, isGlobalEnabled: true } });
  if (global?.apiKey) return { setting: global, source: 'global' as const };

  return { setting: null, source: 'none' as const };
};

const positionsByFormation: Record<string, string[]> = {
  '4-3-3': ['门将', '左后卫', '中后卫', '中后卫', '右后卫', '防守中场', '中场', '进攻中场', '左边锋', '中锋', '右边锋'],
  '4-2-3-1': ['门将', '左后卫', '中后卫', '中后卫', '右后卫', '后腰', '后腰', '左前腰', '前腰', '右前腰', '中锋'],
  '4-4-2': ['门将', '左后卫', '中后卫', '中后卫', '右后卫', '左中场', '中场', '中场', '右中场', '前锋', '前锋'],
  '5-4-1': ['门将', '左翼卫', '中后卫', '中后卫', '中后卫', '右翼卫', '左中场', '中场', '中场', '右中场', '中锋']
};

const chooseFormation = (team: Team, opponent: Team) => {
  const own = team.stats?.overall || 80;
  const opp = opponent.stats?.overall || 80;
  if (own - opp >= 8) return '4-3-3';
  if (opp - own >= 8) return '5-4-1';
  return own >= 84 ? '4-2-3-1' : '4-4-2';
};

const playerPositionBucket = (position?: string) => {
  const value = String(position || '').toLowerCase();
  if (/门将|goalkeeper|keeper/.test(value)) return 'goalkeeper';
  if (/后卫|翼卫|defender|back/.test(value)) return 'defender';
  if (/中场|前腰|后腰|midfielder|midfield/.test(value)) return 'midfielder';
  if (/前锋|边锋|中锋|attacker|forward|striker|winger/.test(value)) return 'attacker';
  return 'unknown';
};

const roleBucket = (role: string) => {
  if (/门将|闂ㄥ皢/.test(role)) return 'goalkeeper';
  if (/后卫|翼卫|悗鍗|考鍗/.test(role)) return 'defender';
  if (/中场|前腰|后腰|前卫|涓満|叞|鑵|腑鍦/.test(role)) return 'midfielder';
  return 'attacker';
};

const buildLineupFromRealPlayers = (team: Team, positions: string[]) => {
  const players = Array.isArray(team.players) ? [...team.players] : [];
  if (players.length === 0) return undefined;

  const used = new Set<string>();
  const pickPlayer = (role: string) => {
    const bucket = roleBucket(role);
    const exact = players.find(player => !used.has(String(player.id || player.name)) && playerPositionBucket(player.position) === bucket);
    const fallback = players.find(player => !used.has(String(player.id || player.name)));
    const selected = exact || fallback;
    if (selected) used.add(String(selected.id || selected.name));
    return selected as TeamPlayer | undefined;
  };

  return positions.map((position, index) => {
    const player = pickPlayer(position);
    return {
      number: player?.number || index + 1,
      name: player?.name || `${team.shortName || team.name.slice(0, 3).toUpperCase()}-${position}-${index + 1}`,
      position,
      originalPosition: player?.position,
      photo: player?.photo,
      age: player?.age,
      rating: clamp((team.stats?.overall || 80) + Math.floor(Math.random() * 7) - 3, 55, 99),
      source: player ? team.playerSource || 'api-football' : 'generated'
    };
  });
};

const buildTeamPlan = (team: Team, opponent: Team) => {
  const formation = chooseFormation(team, opponent);
  const positions = positionsByFormation[formation];
  const nameSeed = team.shortName || team.name.slice(0, 3).toUpperCase();
  const realLineup = buildLineupFromRealPlayers(team, positions);
  return {
    teamId: team.id,
    teamName: team.name,
    country: team.country,
    formation,
    playerSource: team.playerSource || 'generated',
    lineup: realLineup || positions.map((position, index) => ({
      number: index + 1,
      name: `${nameSeed}-${position}-${index + 1}`,
      position,
      rating: clamp((team.stats?.overall || 80) + Math.floor(Math.random() * 7) - 3, 55, 99)
    })),
    tactics: {
      mentality: (team.stats?.overall || 80) >= (opponent.stats?.overall || 80) ? '主动控球' : '稳守反击',
      pressing: clamp(Math.round(((team.stats?.midfield || 80) + (team.stats?.attack || 80)) / 2), 50, 99),
      defensiveLine: (team.stats?.defense || 80) >= 84 ? '中高位' : '中低位',
      passingStyle: (team.stats?.midfield || 80) >= 84 ? '短传渗透' : '直接推进',
      attackingWidth: formation === '4-3-3' ? '拉开宽度' : '保持紧凑'
    }
  };
};

const normalizeApiBaseUrl = (value: string) => value.replace(/\/+$/, '');

const extractJson = (content: string) => {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1] : trimmed);
};

const buildFallbackStep = (session: AIMatchSession, match: Match, nextMinute: number) => {
  const homeOverall = match.homeTeam?.stats?.overall || 80;
  const awayOverall = match.awayTeam?.stats?.overall || 80;
  const homeChance = clamp(0.08 + (homeOverall - awayOverall) / 400, 0.03, 0.18);
  const awayChance = clamp(0.08 + (awayOverall - homeOverall) / 400, 0.03, 0.18);
  const homeGoals = Math.random() < homeChance ? 1 : 0;
  const awayGoals = Math.random() < awayChance ? 1 : 0;
  const events = [];
  if (homeGoals) events.push({ minute: nextMinute, type: 'goal', team: 'home', player: session.homePlan?.lineup?.[10]?.name || match.homeTeam?.name, text: `${match.homeTeam?.name} 抓住机会破门得分。` });
  if (awayGoals) events.push({ minute: nextMinute, type: 'goal', team: 'away', player: session.awayPlan?.lineup?.[10]?.name || match.awayTeam?.name, text: `${match.awayTeam?.name} 反击中完成进球。` });
  if (!events.length) events.push({ minute: nextMinute, type: 'commentary', team: 'neutral', text: '双方在中场持续争夺，比赛节奏保持紧张。' });
  return {
    commentary: events.map(event => event.text).join('\n'),
    homeGoals,
    awayGoals,
    events,
    statisticsDelta: {
      homeShots: homeGoals + Math.floor(Math.random() * 3),
      awayShots: awayGoals + Math.floor(Math.random() * 3),
      homeShotsOnTarget: homeGoals,
      awayShotsOnTarget: awayGoals,
      homeCorners: Math.floor(Math.random() * 2),
      awayCorners: Math.floor(Math.random() * 2),
      homeFouls: Math.floor(Math.random() * 3),
      awayFouls: Math.floor(Math.random() * 3)
    }
  };
};

const balancePair = (home: number, away: number, maxDiff: number, minRatio: number) => {
  let balancedHome = home;
  let balancedAway = away;
  const high = Math.max(balancedHome, balancedAway);
  const low = Math.min(balancedHome, balancedAway);
  if (high >= 10 && low / high < minRatio) {
    if (balancedHome > balancedAway) balancedAway = Math.round(high * minRatio);
    else balancedHome = Math.round(high * minRatio);
  }
  if (Math.abs(balancedHome - balancedAway) > maxDiff) {
    if (balancedHome > balancedAway) balancedHome = balancedAway + maxDiff;
    else balancedAway = balancedHome + maxDiff;
  }
  return [balancedHome, balancedAway];
};

const mergeStatistics = (current: any, delta: any) => {
  let homeShots = (current?.homeShots || 0) + clamp(Number(delta?.homeShots) || 0, 0, 5);
  let awayShots = (current?.awayShots || 0) + clamp(Number(delta?.awayShots) || 0, 0, 5);
  let homeCorners = (current?.homeCorners || 0) + clamp(Number(delta?.homeCorners) || 0, 0, 2);
  let awayCorners = (current?.awayCorners || 0) + clamp(Number(delta?.awayCorners) || 0, 0, 2);
  [homeShots, awayShots] = balancePair(homeShots, awayShots, 10, 0.35);
  [homeCorners, awayCorners] = balancePair(homeCorners, awayCorners, 5, 0.25);
  const homeShotsOnTarget = Math.min(homeShots, (current?.homeShotsOnTarget || 0) + clamp(Number(delta?.homeShotsOnTarget) || 0, 0, 3));
  const awayShotsOnTarget = Math.min(awayShots, (current?.awayShotsOnTarget || 0) + clamp(Number(delta?.awayShotsOnTarget) || 0, 0, 3));
  return {
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homeCorners,
    awayCorners,
    homeFouls: (current?.homeFouls || 0) + clamp(Number(delta?.homeFouls) || 0, 0, 5),
    awayFouls: (current?.awayFouls || 0) + clamp(Number(delta?.awayFouls) || 0, 0, 5)
  };
};

export class LLMController {
  static async getSettings(req: AuthRequest, res: Response) {
    const effectiveSetting = await getEffectiveLLMSetting(req.user!.id);
    const setting = effectiveSetting.setting;
    res.json(setting ? {
      apiBaseUrl: setting.apiBaseUrl,
      model: effectiveSetting.source === 'global' ? `${setting.model} (全局)` : setting.model,
      voiceEnabled: setting.voiceEnabled,
      hasApiKey: !!setting.apiKey
    } : null);
  }

  static async saveSettings(req: AuthRequest, res: Response) {
    const { apiBaseUrl, apiKey, model, voiceEnabled } = req.body;
    if (!apiBaseUrl || !model) return res.status(400).json({ error: 'API 地址和模型不能为空' });
    const repository = AppDataSource.getRepository(LLMSetting);
    let setting = await repository.findOne({ where: { user: { id: req.user!.id }, isGlobal: false }, relations: ['user'] });
    if (!setting) setting = repository.create({ user: req.user! });
    setting.isGlobal = false;
    setting.isGlobalEnabled = false;
    setting.apiBaseUrl = normalizeApiBaseUrl(String(apiBaseUrl));
    setting.model = String(model);
    setting.voiceEnabled = !!voiceEnabled;
    if (apiKey) setting.apiKey = encrypt(String(apiKey));
    if (!setting.apiKey) return res.status(400).json({ error: 'API Key 不能为空' });
    await repository.save(setting);
    res.json({ apiBaseUrl: setting.apiBaseUrl, model: setting.model, voiceEnabled: setting.voiceEnabled, hasApiKey: true });
  }

  static async getGlobalSettings(_req: Request, res: Response) {
    const setting = await AppDataSource.getRepository(LLMSetting).findOne({ where: { isGlobal: true } });
    res.json(setting ? {
      apiBaseUrl: setting.apiBaseUrl,
      model: setting.model,
      voiceEnabled: setting.voiceEnabled,
      isGlobalEnabled: setting.isGlobalEnabled,
      hasApiKey: !!setting.apiKey
    } : {
      apiBaseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      voiceEnabled: false,
      isGlobalEnabled: false,
      hasApiKey: false
    });
  }

  static async saveGlobalSettings(req: Request, res: Response) {
    const { apiBaseUrl, apiKey, model, voiceEnabled, isGlobalEnabled } = req.body;
    if (!apiBaseUrl || !model) return res.status(400).json({ error: 'API 地址和模型不能为空' });
    const repository = AppDataSource.getRepository(LLMSetting);
    let setting = await repository.findOne({ where: { isGlobal: true } });
    if (!setting) setting = repository.create({ isGlobal: true });
    setting.user = undefined;
    setting.isGlobal = true;
    setting.isGlobalEnabled = !!isGlobalEnabled;
    setting.apiBaseUrl = normalizeApiBaseUrl(String(apiBaseUrl));
    setting.model = String(model);
    setting.voiceEnabled = !!voiceEnabled;
    if (apiKey) setting.apiKey = encrypt(String(apiKey));
    if (setting.isGlobalEnabled && !setting.apiKey) return res.status(400).json({ error: '开启全局 AI 时 API Key 不能为空' });
    await repository.save(setting);
    res.json({
      apiBaseUrl: setting.apiBaseUrl,
      model: setting.model,
      voiceEnabled: setting.voiceEnabled,
      isGlobalEnabled: setting.isGlobalEnabled,
      hasApiKey: !!setting.apiKey
    });
  }

  static async getPrompts(_req: Request, res: Response) {
    const prompts = await AppDataSource.getRepository(LLMPromptTemplate).find({ order: { key: 'ASC' } });
    res.json(prompts);
  }

  static async updatePrompt(req: Request, res: Response) {
    const { key } = req.params;
    if (!PROMPT_KEYS.includes(key as LLMPromptTemplateKey)) return res.status(400).json({ error: 'Invalid prompt key' });
    const repository = AppDataSource.getRepository(LLMPromptTemplate);
    const prompt = await repository.findOne({ where: { key: key as LLMPromptTemplateKey } });
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    prompt.title = req.body.title || prompt.title;
    prompt.content = req.body.content || prompt.content;
    prompt.isActive = req.body.isActive !== undefined ? !!req.body.isActive : prompt.isActive;
    res.json(await repository.save(prompt));
  }

  static async createSession(req: AuthRequest, res: Response) {
    const durationMinutes = clamp(Number(req.body.durationMinutes) || 8, 4, 90);
    const match = await AppDataSource.getRepository(Match).findOne({
      where: { id: req.params.matchId },
      relations: ['homeTeam', 'awayTeam', 'tournament', 'tournament.user']
    });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.tournament.user.id !== req.user!.id) return res.status(403).json({ error: 'Access denied' });
    if (match.status !== 'scheduled') return res.status(400).json({ error: 'Only scheduled matches can start AI duel' });
    if (!match.homeTeam || !match.awayTeam) return res.status(400).json({ error: 'Teams are not assigned yet' });

    const effectiveSetting = await getEffectiveLLMSetting(req.user!.id);
    const setting = effectiveSetting.setting;
    if (!setting) return res.status(400).json({ error: '请先配置 AI API 地址、Key 和模型' });

    const sessionRepository = AppDataSource.getRepository(AIMatchSession);
    const homePlan = buildTeamPlan(match.homeTeam, match.awayTeam);
    const awayPlan = buildTeamPlan(match.awayTeam, match.homeTeam);
    const session = sessionRepository.create({
      match,
      user: req.user!,
      durationMinutes,
      status: 'ready',
      model: setting.model,
      homePlan,
      awayPlan,
      engineState: AIMatchEngine.createInitialState(match.homeTeam, match.awayTeam, homePlan, awayPlan),
      statistics: {},
      events: []
    });
    res.status(201).json(await sessionRepository.save(session));
  }

  static async stepSession(req: AuthRequest, res: Response) {
    const sessionRepository = AppDataSource.getRepository(AIMatchSession);
    const session = await sessionRepository.findOne({
      where: { id: req.params.sessionId },
      relations: ['match', 'match.homeTeam', 'match.awayTeam', 'match.tournament', 'match.tournament.user', 'user']
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.user.id !== req.user!.id) return res.status(403).json({ error: 'Access denied' });
    if (session.status === 'finished' || session.status === 'saved') return res.json(session);

    const effectiveSetting = await getEffectiveLLMSetting(req.user!.id);
    const setting = effectiveSetting.setting;
    if (!setting) return res.status(400).json({ error: '请先配置 AI API' });

    const enginePrompts = await AppDataSource.getRepository(LLMPromptTemplate).find();
    const engineStepPrompt = enginePrompts.find(prompt => prompt.key === 'match_step' && prompt.isActive)?.content || '';
    const engineState = session.engineState || AIMatchEngine.createInitialState(session.match.homeTeam, session.match.awayTeam, session.homePlan, session.awayPlan);
    const engineResult = AIMatchEngine.simulateSegment({
      match: session.match,
      state: engineState,
      currentMinute: session.currentMinute,
      homeScore: session.homeScore,
      awayScore: session.awayScore,
      homePlan: session.homePlan,
      awayPlan: session.awayPlan
    });

    let narration: any = {};
    try {
      const response = await axios.post(`${normalizeApiBaseUrl(setting.apiBaseUrl)}/chat/completions`, {
        model: setting.model,
        temperature: 0.75,
        messages: [
          { role: 'system', content: `${engineStepPrompt}\n你只负责把系统已经决定的比赛事件润色成足球广播解说。禁止新增进球、比分、射门、角球或任何统计。严格返回 JSON：{"events":[{"index":0,"text":"润色后的中文解说"}]}` },
          { role: 'user', content: JSON.stringify({ minuteFrom: session.currentMinute, minuteTo: engineResult.nextMinute, matchTotalMinutes: 90, playbackDurationMinutes: session.durationMinutes, score: { home: session.homeScore + engineResult.scoreDelta.home, away: session.awayScore + engineResult.scoreDelta.away }, decidedEvents: engineResult.events, home: session.homePlan, away: session.awayPlan, recentEvents: (session.events || []).slice(-12) }) }
        ]
      }, {
        headers: { Authorization: `Bearer ${decrypt(setting.apiKey || '')}` },
        timeout: 30000
      });
      narration = extractJson(response.data?.choices?.[0]?.message?.content || '');
    } catch (error) {
      console.error('AI duel narration failed, using engine text:', error);
    }

    const llmTexts = new Map<number, string>();
    if (Array.isArray(narration.events)) {
      narration.events.forEach((event: any) => {
        const index = Number(event.index);
        if (Number.isInteger(index) && event.text) llmTexts.set(index, String(event.text));
      });
    }

    session.currentMinute = engineResult.nextMinute;
    session.homeScore += engineResult.scoreDelta.home;
    session.awayScore += engineResult.scoreDelta.away;
    session.events = [...(session.events || []), ...engineResult.events.map((event, index) => ({ ...event, text: llmTexts.get(index) || event.text }))];
    session.statistics = mergeStatistics(session.statistics, engineResult.statisticsDelta || {});
    session.engineState = engineResult.engineState;
    session.status = engineResult.nextMinute >= 90 ? 'finished' : 'running';
    return res.json(await sessionRepository.save(session));

    /*
    const prompts = await AppDataSource.getRepository(LLMPromptTemplate).find();
    const stepPrompt = prompts.find(prompt => prompt.key === 'match_step' && prompt.isActive)?.content || '';
    const matchTotalMinutes = 90;
    const stepSize = 5;
    const nextMinute = Math.min(matchTotalMinutes, session.currentMinute + stepSize);

    let payload: any;
    try {
      const response = await axios.post(`${normalizeApiBaseUrl(setting.apiBaseUrl)}/chat/completions`, {
        model: setting.model,
        temperature: 0.8,
        messages: [
          { role: 'system', content: `${stepPrompt}\n返回 JSON 格式：{"commentary":"中文解说","homeGoals":0,"awayGoals":0,"events":[{"minute":1,"type":"goal|commentary|card|injury","team":"home|away|neutral","player":"球员","text":"描述"}],"statisticsDelta":{"homeShots":0,"awayShots":0,"homeShotsOnTarget":0,"awayShotsOnTarget":0,"homeCorners":0,"awayCorners":0,"homeFouls":0,"awayFouls":0}}` },
          { role: 'user', content: JSON.stringify({ minuteFrom: session.currentMinute, minuteTo: nextMinute, matchTotalMinutes, playbackDurationMinutes: session.durationMinutes, score: { home: session.homeScore, away: session.awayScore }, home: session.homePlan, away: session.awayPlan, recentEvents: (session.events || []).slice(-12) }) }
        ]
      }, {
        headers: { Authorization: `Bearer ${decrypt(setting.apiKey)}` },
        timeout: 30000
      });
      payload = extractJson(response.data?.choices?.[0]?.message?.content || '');
    } catch (error) {
      console.error('AI duel step failed, using fallback:', error);
      payload = buildFallbackStep(session, session.match, nextMinute);
    }

    const currentTotalGoals = session.homeScore + session.awayScore;
    const totalGoalLimit = 7;
    let homeGoals = Number(payload.homeGoals) > 0 ? 1 : 0;
    let awayGoals = Number(payload.awayGoals) > 0 ? 1 : 0;
    if (session.homeScore - session.awayScore >= 4) homeGoals = 0;
    if (session.awayScore - session.homeScore >= 4) awayGoals = 0;
    if (currentTotalGoals >= totalGoalLimit) {
      homeGoals = 0;
      awayGoals = 0;
    } else if (currentTotalGoals + homeGoals + awayGoals > totalGoalLimit) {
      if (homeGoals && awayGoals) awayGoals = 0;
      if (currentTotalGoals + homeGoals + awayGoals > totalGoalLimit) homeGoals = 0;
    }
    const events = Array.isArray(payload.events) ? payload.events.slice(0, 6).map((event: any) => ({
      minute: clamp(Number(event.minute) || nextMinute, 1, matchTotalMinutes),
      type: String(event.type || 'commentary'),
      team: String(event.team || 'neutral'),
      key: Boolean(event.key || ['goal', 'penalty', 'card', 'injury', 'chance', 'save'].includes(String(event.type || ''))),
      player: event.player ? String(event.player) : undefined,
      text: String(event.text || payload.commentary || '比赛继续进行。')
    })) : [];

    session.currentMinute = nextMinute;
    session.homeScore += homeGoals;
    session.awayScore += awayGoals;
    session.events = [...(session.events || []), ...events];
    session.statistics = mergeStatistics(session.statistics, payload.statisticsDelta || {});
    session.status = nextMinute >= matchTotalMinutes ? 'finished' : 'running';
    res.json(await sessionRepository.save(session));
  }

    */
  }

  static async markSaved(req: AuthRequest, res: Response) {
    const repository = AppDataSource.getRepository(AIMatchSession);
    const session = await repository.findOne({ where: { id: req.params.sessionId }, relations: ['user'] });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.user.id !== req.user!.id) return res.status(403).json({ error: 'Access denied' });
    session.status = 'saved';
    session.savedToMatch = true;
    res.json(await repository.save(session));
  }

  static async finishSession(req: AuthRequest, res: Response) {
    const repository = AppDataSource.getRepository(AIMatchSession);
    const session = await repository.findOne({
      where: { id: req.params.sessionId },
      relations: ['match', 'match.homeTeam', 'match.awayTeam', 'user']
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.user.id !== req.user!.id) return res.status(403).json({ error: 'Access denied' });
    if (session.status === 'saved') return res.json(session);

    let guard = 0;
    while (session.currentMinute < 90 && guard < 30) {
      guard += 1;
      const engineState = session.engineState || AIMatchEngine.createInitialState(session.match.homeTeam, session.match.awayTeam, session.homePlan, session.awayPlan);
      const result = AIMatchEngine.simulateSegment({
        match: session.match,
        state: engineState,
        currentMinute: session.currentMinute,
        homeScore: session.homeScore,
        awayScore: session.awayScore,
        homePlan: session.homePlan,
        awayPlan: session.awayPlan
      });
      session.currentMinute = result.nextMinute;
      session.homeScore += result.scoreDelta.home;
      session.awayScore += result.scoreDelta.away;
      session.events = [...(session.events || []), ...result.events];
      session.statistics = mergeStatistics(session.statistics, result.statisticsDelta || {});
      session.engineState = result.engineState;
    }

    if (!session.match.groupName && session.homeScore === session.awayScore) {
      let homePenaltyScore = 0;
      let awayPenaltyScore = 0;
      for (let round = 0; round < 5; round += 1) {
        if (Math.random() < 0.76) homePenaltyScore += 1;
        if (Math.random() < 0.76) awayPenaltyScore += 1;
      }
      while (homePenaltyScore === awayPenaltyScore) {
        if (Math.random() < 0.76) homePenaltyScore += 1;
        if (Math.random() < 0.76) awayPenaltyScore += 1;
      }
      session.events = [...(session.events || []), {
        minute: 90,
        type: 'penalty',
        team: homePenaltyScore > awayPenaltyScore ? 'home' : 'away',
        key: true,
        text: `点球大战自动完成：${homePenaltyScore}-${awayPenaltyScore}。`,
        engine: true,
        autoPenalty: { homePenaltyScore, awayPenaltyScore }
      }];
    }

    session.currentMinute = 90;
    session.status = 'finished';
    res.json(await repository.save(session));
  }

  static async appendSessionEvent(req: AuthRequest, res: Response) {
    const repository = AppDataSource.getRepository(AIMatchSession);
    const session = await repository.findOne({ where: { id: req.params.sessionId }, relations: ['user'] });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.user.id !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    const event = {
      minute: clamp(Number(req.body.minute) || session.currentMinute || 1, 1, 90),
      type: String(req.body.type || 'manual_feedback'),
      team: String(req.body.team || 'neutral'),
      key: true,
      player: req.body.player ? String(req.body.player) : undefined,
      text: String(req.body.text || '人工判定完成。'),
      manual: true,
      dice: req.body.dice
    };

    session.events = [...(session.events || []), event];
    const stats = session.statistics || {};
    if (event.team === 'home') {
      stats.homeShots = (stats.homeShots || 0) + 1;
      if (event.type === 'goal') {
        session.homeScore += 1;
        stats.homeShotsOnTarget = (stats.homeShotsOnTarget || 0) + 1;
      } else if (event.type === 'save') {
        stats.homeShotsOnTarget = (stats.homeShotsOnTarget || 0) + 1;
      }
    } else if (event.team === 'away') {
      stats.awayShots = (stats.awayShots || 0) + 1;
      if (event.type === 'goal') {
        session.awayScore += 1;
        stats.awayShotsOnTarget = (stats.awayShotsOnTarget || 0) + 1;
      } else if (event.type === 'save') {
        stats.awayShotsOnTarget = (stats.awayShotsOnTarget || 0) + 1;
      }
    }
    session.statistics = stats;
    if (session.engineState) {
      session.engineState = AIMatchEngine.applyManualFeedback(session.engineState, event.type);
    }
    res.json(await repository.save(session));
  }
}
