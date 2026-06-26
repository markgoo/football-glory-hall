import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AIMatchSession } from '../models/AIMatchSession';
import { LLMSetting } from '../models/LLMSetting';
import { LLMPromptTemplate, LLMPromptTemplateKey } from '../models/LLMPromptTemplate';
import { Match } from '../models/Match';
import { Team, TeamPlayer } from '../models/Team';
import { AIMatchEngine } from '../services/aiMatchEngine';
import FootballAPIService from '../services/footballAPIService';

const ENCRYPTION_PREFIX = 'enc:v1:';
const PROMPT_KEYS: LLMPromptTemplateKey[] = ['match_intro', 'match_step', 'match_summary'];
type UILanguage = 'zh' | 'en';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalizeLanguage = (value: any): UILanguage => value === 'en' ? 'en' : 'zh';
const normalizeApiBaseUrl = (value: string) => value.replace(/\/+$/, '');

const languageName = (language: UILanguage) => language === 'en' ? 'English' : 'Simplified Chinese';
const normalizeReasoningEffort = (value?: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['max', 'xhigh'].includes(normalized)) return 'max';
  if (['low', 'medium', 'high'].includes(normalized)) return 'high';
  return '';
};
const buildChatCompletionBody = (setting: LLMSetting, body: Record<string, any>) => {
  const reasoningEffort = normalizeReasoningEffort(setting.reasoningEffort) || 'high';
  return {
    ...body,
    thinking: { type: setting.thinkingEnabled ? 'enabled' : 'disabled' },
    ...(setting.thinkingEnabled && reasoningEffort ? { reasoning_effort: reasoningEffort } : {})
  };
};
const stripThinkingControls = (body: Record<string, any>) => {
  const rest = { ...body };
  delete rest.thinking;
  delete rest.reasoning_effort;
  return rest;
};
const postChatCompletion = async (setting: LLMSetting, body: Record<string, any>, timeout: number) => {
  const url = `${normalizeApiBaseUrl(setting.apiBaseUrl)}/chat/completions`;
  const headers = { Authorization: `Bearer ${decrypt(setting.apiKey || '')}` };
  const payload = buildChatCompletionBody(setting, body);
  try {
    return await axios.post(url, payload, { headers, timeout });
  } catch (error: any) {
    if (error.response?.status && error.response.status < 500) {
      return axios.post(url, stripThinkingControls(payload), { headers, timeout });
    }
    throw error;
  }
};
const languageInstruction = (language: UILanguage) => {
  if (language === 'en') {
    return [
      'Output language: English.',
      'You are a football radio commentator. Use natural football commentary, not generic AI narration.',
      'For each event return two fields: text for the live text feed, and broadcastText for radio voice.',
      'broadcastText should be one coherent radio commentary paragraph, vivid and meaningful, with enough context to feel continuous. Avoid empty filler and avoid over-short dry lines.',
      'broadcastText must be natural and player-focused when possible. Prefer player names over team names, but keep the tactical context if useful.',
      'You will receive recentBroadcastTexts. Do not reuse their sentence rhythm, key verbs, or player pair framing. If the current event is routine, change the camera angle: first touch, body shape, crowd reaction, defender step, loose ball, keeper distribution, or tempo change.',
      'Broadcast style: passionate Chinese-football-commentary energy, fast tempo, emotional, explosive on big moments, but do not imitate any specific real person.',
      'For goals, penalties, cards, injuries, and big chances, broadcastText should sound urgent and emotional.',
      'If the event type is chance or penalty, it is unresolved. Describe only the opportunity and tension. Do not say it was scored, saved, missed, converted, or denied. The dice result will arrive as a later event.',
      'If mentioning the score, use only the provided score object. Never infer, increment, or invent a different score.',
      'Only polish the already-decided events. Do not invent goals, scores, shots, corners, cards, injuries, substitutions, or statistics.',
      'Return strict JSON only: {"events":[{"index":0,"text":"polished English live text","broadcastText":"coherent radio commentary paragraph"}]}.'
    ].join('\n');
  }

  return [
    '输出语言：简体中文。',
    '你是足球广播解说员，语气要像真实足球解说，不要出现模板化开场。',
    '每个事件返回两个字段：text 用于文字直播，broadcastText 用于广播语音。',
    'broadcastText 写成一段连贯的广播解说，内容要有意义、有过程感，不要空洞灌水，也不要短到像提示词。',
    'broadcastText 要自然，能说球员就说球员，但需要战术背景时也可以说球队。',
    '中文输出时，英文球员名要尽量音译成中文口播名，不要直接照读整串英文缩写；可以保留号码，例如“9号巴蒂斯图塔”。',
    '你会收到 recentBroadcastTexts。不要复用里面的句式节奏、核心动词、球员组合表达。如果当前事件普通，就换一个镜头：第一脚触球、身体姿态、看台反应、防守队员上步、二点球、门将发起、节奏变化。',
    '广播风格：激情足球解说，高能、快节奏、关键时刻爆发，但不要模仿任何具体真人。',
    '进球、点球、红黄牌、伤停和绝佳机会的 broadcastText 要更急、更激动。',
    '如果事件类型是 chance 或 penalty，说明这只是待判定机会。只能描述机会和紧张感，不要说已经进球、扑出、打飞、罚进或罚丢。骰子结果会作为后续事件传入。',
    '如果提到比分，只能使用输入里的 score 对象。禁止自行推算、递增或编造其他比分。',
    '你只负责润色系统已经决定的比赛事件，禁止新增进球、比分、射门、角球、红黄牌、伤病、换人或任何统计。',
    '严格只返回 JSON：{"events":[{"index":0,"text":"润色后的中文文字直播","broadcastText":"一段连贯的广播解说"}]}。'
  ].join('\n');
};

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
  if (/门将/.test(role)) return 'goalkeeper';
  if (/后卫|翼卫/.test(role)) return 'defender';
  if (/中场|前腰|后腰/.test(role)) return 'midfielder';
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
      name: player?.nameZh || player?.name || player?.nameEn || `${team.shortName || team.name.slice(0, 3).toUpperCase()}-${position}-${index + 1}`,
      nameEn: player?.nameEn || player?.name,
      nameZh: player?.nameZh,
      position,
      originalPosition: player?.position,
      photo: player?.photo,
      age: player?.age,
      rating: clamp((team.stats?.overall || 80) + Math.floor(Math.random() * 7) - 3, 55, 99),
      source: player ? team.playerSource || 'api-football' : 'generated'
    };
  });
};

const normalizeApiPlayerPosition = (position?: string) => {
  const value = String(position || '').toLowerCase();
  if (value.includes('goalkeeper')) return '门将';
  if (value.includes('defender')) return '后卫';
  if (value.includes('midfielder')) return '中场';
  if (value.includes('attacker')) return '前锋';
  return position || '球员';
};

const hydrateMissingRealPlayers = async (team: Team, national: boolean) => {
  if (team.playerSource === 'api-football' && Array.isArray(team.players) && team.players.length > 0) return team;

  try {
    const { apiId, squad } = await FootballAPIService.getResolvedTeamSquad({
      name: team.name,
      country: team.country,
      preferredId: team.externalApiId,
      national
    });
    if (apiId) team.externalApiId = apiId;
    if (squad?.players?.length) {
      team.players = squad.players.map((player: any, index: number) => ({
        id: player.id,
        name: player.name || `Player ${index + 1}`,
        nameEn: player.name || `Player ${index + 1}`,
        age: player.age,
        number: player.number || index + 1,
        position: normalizeApiPlayerPosition(player.position),
        photo: player.photo
      }));
      team.playerSource = 'api-football';
      team.playersSyncedAt = new Date();
      await AppDataSource.getRepository(Team).save(team);
    }
  } catch (error: any) {
    console.warn(`Failed to hydrate AI duel players for ${team.name}:`, error.message);
  }

  return team;
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

const extractJson = (content: string) => {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1] : trimmed);
};

const withChineseBroadcastNames = (plan: any) => {
  if (!plan?.lineup) return plan;
  return {
    ...plan,
    lineup: plan.lineup.map((player: any) => {
      const raw = String(player?.nameZh || player?.name || player?.nameEn || '').trim();
      const parts = raw.split(/\s+/).filter(Boolean);
      const surname = parts.length > 1 ? parts[parts.length - 1] : raw;
      return {
        ...player,
        broadcastNameHint: player?.nameZh || (player?.number ? `${player.number}号 ${surname}` : surname)
      };
    })
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
  return {
    homeShots,
    awayShots,
    homeShotsOnTarget: Math.min(homeShots, (current?.homeShotsOnTarget || 0) + clamp(Number(delta?.homeShotsOnTarget) || 0, 0, 3)),
    awayShotsOnTarget: Math.min(awayShots, (current?.awayShotsOnTarget || 0) + clamp(Number(delta?.awayShotsOnTarget) || 0, 0, 3)),
    homeCorners,
    awayCorners,
    homeFouls: (current?.homeFouls || 0) + clamp(Number(delta?.homeFouls) || 0, 0, 5),
    awayFouls: (current?.awayFouls || 0) + clamp(Number(delta?.awayFouls) || 0, 0, 5)
  };
};

const toVisibleAIMatchEvents = (
  events: any[],
  llmTexts = new Map<number, string>(),
  llmBroadcastTexts = new Map<number, string>()
) => events
  .map((event, index) => {
    const text = llmTexts.get(index);
    const broadcastText = llmBroadcastTexts.get(index);
    if (event.type === 'commentary' && !text && !broadcastText) return null;
    return { ...event, text: text || event.text, broadcastText };
  })
  .filter(Boolean);

export class LLMController {
  static async diceCommentary(req: AuthRequest, res: Response) {
    const effectiveSetting = await getEffectiveLLMSetting(req.user!.id);
    const setting = effectiveSetting.setting;
    if (!setting?.apiKey) return res.json({ enabled: false });

    const language = normalizeLanguage(req.body?.language);
    const shooter = Number(req.body?.shooter);
    const keeper = Number(req.body?.keeper);
    const phase = String(req.body?.phase || 'result');
    const hasShot = Number.isFinite(shooter);
    const hasSave = Number.isFinite(keeper);
    const isResolvedPhase = phase === 'result' && hasShot && hasSave;
    const isGoal = hasShot && hasSave && shooter > 0 && shooter >= keeper;
    const missed = shooter === 0;
    const result = hasShot && hasSave ? (missed ? 'missed' : isGoal ? 'goal' : 'saved') : 'pending';
    const instruction = [
      'Generate one football radio commentary line for a dice mini-game.',
      `Output language must be ${language === 'en' ? 'English' : 'Simplified Chinese'}.`,
      'The dice values are action strength values only. Never treat a dice value as a shirt number or player number.',
      phase === 'shoot'
        ? 'This is only the shot phase. Describe the shooter striking the ball and the quality or danger of the shot. Do not mention the goalkeeper making a save, the ball going in, the ball missing, or the final result.'
        : phase === 'save'
          ? 'This is only the goalkeeper phase. Describe the goalkeeper preparing or reacting, but do not announce a final result unless both shotDiceValue and saveDiceValue are present.'
          : 'This is the final resolved phase. Announce only the final outcome based on result. Do not repeat the shooting setup, attacking move, shot description, or earlier action. If result is saved, focus on the goalkeeper save. If result is goal, focus on the ball going in. If result is missed, focus on the shot missing.',
      'No extra facts. Return strict JSON only.'
    ].join(' ');

    try {
      const response = await postChatCompletion(setting, {
        model: setting.model,
        temperature: 0.95,
        messages: [
          {
            role: 'system',
            content: 'You are a passionate football radio commentator. Return strict JSON only: {"text":"one coherent radio commentary line"}. Do not imitate any specific real person. Be vivid, spontaneous, and meaningful.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              language,
              phase,
              shotDiceValue: isResolvedPhase ? shooter : null,
              saveDiceValue: isResolvedPhase ? keeper : null,
              result: isResolvedPhase ? result : 'pending',
              instruction
            })
          }
        ]
      }, 12000);
      const parsed = extractJson(response.data?.choices?.[0]?.message?.content || '');
      const text = String(parsed?.text || '').trim();
      if (['intro', 'shoot', 'save'].includes(phase) && /(进球|球进|破门|入网|扑出|扑救|打飞|miss|goal|saved|save)/i.test(text)) {
        return res.json({ enabled: false });
      }
      if (['intro', 'shoot', 'save'].includes(phase) && /(?:骰子|点数|掷出|摇出|得到|投出|rolled|dice|value|number|[0-6])/.test(text)) {
        return res.json({ enabled: false });
      }
      return res.json({ enabled: Boolean(text), text });
    } catch (error) {
      console.error('Dice commentary failed:', error);
      return res.json({ enabled: false });
    }
  }

  static async getSettings(req: AuthRequest, res: Response) {
    const effectiveSetting = await getEffectiveLLMSetting(req.user!.id);
    const setting = effectiveSetting.setting;
    res.json(setting ? {
      apiBaseUrl: setting.apiBaseUrl,
      model: effectiveSetting.source === 'global' ? `${setting.model} (全局)` : setting.model,
      voiceEnabled: setting.voiceEnabled,
      thinkingEnabled: setting.thinkingEnabled,
      reasoningEffort: setting.reasoningEffort || '',
      hasApiKey: !!setting.apiKey
    } : null);
  }

  static async saveSettings(req: AuthRequest, res: Response) {
    const { apiBaseUrl, apiKey, model, voiceEnabled, thinkingEnabled, reasoningEffort } = req.body;
    if (!apiBaseUrl || !model) return res.status(400).json({ error: 'API 地址和模型不能为空' });
    const repository = AppDataSource.getRepository(LLMSetting);
    let setting = await repository.findOne({ where: { user: { id: req.user!.id }, isGlobal: false }, relations: ['user'] });
    if (!setting) setting = repository.create({ user: req.user! });
    setting.isGlobal = false;
    setting.isGlobalEnabled = false;
    setting.apiBaseUrl = normalizeApiBaseUrl(String(apiBaseUrl));
    setting.model = String(model);
    setting.voiceEnabled = !!voiceEnabled;
    setting.thinkingEnabled = !!thinkingEnabled;
    setting.reasoningEffort = setting.thinkingEnabled ? normalizeReasoningEffort(reasoningEffort) || undefined : undefined;
    if (apiKey) setting.apiKey = encrypt(String(apiKey));
    if (!setting.apiKey) return res.status(400).json({ error: 'API Key 不能为空' });
    await repository.save(setting);
    res.json({ apiBaseUrl: setting.apiBaseUrl, model: setting.model, voiceEnabled: setting.voiceEnabled, thinkingEnabled: setting.thinkingEnabled, reasoningEffort: setting.reasoningEffort || '', hasApiKey: true });
  }

  static async getGlobalSettings(_req: Request, res: Response) {
    const setting = await AppDataSource.getRepository(LLMSetting).findOne({ where: { isGlobal: true } });
    res.json(setting ? {
      apiBaseUrl: setting.apiBaseUrl,
      model: setting.model,
      voiceEnabled: setting.voiceEnabled,
      thinkingEnabled: setting.thinkingEnabled,
      reasoningEffort: setting.reasoningEffort || '',
      isGlobalEnabled: setting.isGlobalEnabled,
      hasApiKey: !!setting.apiKey
    } : {
      apiBaseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      voiceEnabled: false,
      thinkingEnabled: false,
      reasoningEffort: '',
      isGlobalEnabled: false,
      hasApiKey: false
    });
  }

  static async saveGlobalSettings(req: Request, res: Response) {
    const { apiBaseUrl, apiKey, model, voiceEnabled, thinkingEnabled, reasoningEffort, isGlobalEnabled } = req.body;
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
    setting.thinkingEnabled = !!thinkingEnabled;
    setting.reasoningEffort = setting.thinkingEnabled ? normalizeReasoningEffort(reasoningEffort) || undefined : undefined;
    if (apiKey) setting.apiKey = encrypt(String(apiKey));
    if (setting.isGlobalEnabled && !setting.apiKey) return res.status(400).json({ error: '开启全局 AI 时 API Key 不能为空' });
    await repository.save(setting);
    res.json({
      apiBaseUrl: setting.apiBaseUrl,
      model: setting.model,
      voiceEnabled: setting.voiceEnabled,
      thinkingEnabled: setting.thinkingEnabled,
      reasoningEffort: setting.reasoningEffort || '',
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
    const language = normalizeLanguage(req.body.language);
    if (language === 'en') {
      prompt.titleEn = req.body.title || prompt.titleEn || prompt.title;
      prompt.contentEn = req.body.content || prompt.contentEn || prompt.content;
    } else {
      prompt.title = req.body.title || prompt.title;
      prompt.content = req.body.content || prompt.content;
    }
    prompt.isActive = req.body.isActive !== undefined ? !!req.body.isActive : prompt.isActive;
    res.json(await repository.save(prompt));
  }

  static async createSession(req: AuthRequest, res: Response) {
    const durationMinutes = clamp(Number(req.body.durationMinutes) || 8, 4, 90);
    const language = normalizeLanguage(req.body.language);
    const match = await AppDataSource.getRepository(Match).findOne({
      where: { id: req.params.matchId },
      relations: ['homeTeam', 'awayTeam', 'tournament', 'tournament.user']
    });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.tournament.user.id !== req.user!.id) return res.status(403).json({ error: 'Access denied' });
    if (match.status !== 'scheduled') return res.status(400).json({ error: 'Only scheduled matches can start AI duel' });
    if (!match.homeTeam || !match.awayTeam) return res.status(400).json({ error: 'Teams are not assigned yet' });

    const national = match.tournament?.teamCategory === 'national';
    match.homeTeam = await hydrateMissingRealPlayers(match.homeTeam, national);
    match.awayTeam = await hydrateMissingRealPlayers(match.awayTeam, national);

    const effectiveSetting = await getEffectiveLLMSetting(req.user!.id);
    const setting = effectiveSetting.setting;
    if (!setting) return res.status(400).json({ error: '请先配置 AI API 地址、Key 和模型' });

    const homePlan = buildTeamPlan(match.homeTeam, match.awayTeam);
    const awayPlan = buildTeamPlan(match.awayTeam, match.homeTeam);
    const session = AppDataSource.getRepository(AIMatchSession).create({
      match,
      user: req.user!,
      durationMinutes,
      status: 'ready',
      model: setting.model,
      language,
      homePlan,
      awayPlan,
      engineState: AIMatchEngine.createInitialState(match.homeTeam, match.awayTeam, homePlan, awayPlan),
      statistics: {},
      events: []
    });
    res.status(201).json(await AppDataSource.getRepository(AIMatchSession).save(session));
  }

  static async stepSession(req: AuthRequest, res: Response) {
    const repository = AppDataSource.getRepository(AIMatchSession);
    const session = await repository.findOne({
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
    const sessionLanguage = normalizeLanguage(session.language);
    const stepPrompt = enginePrompts.find(prompt => prompt.key === 'match_step' && prompt.isActive);
    const engineStepPrompt = sessionLanguage === 'en'
      ? (stepPrompt?.contentEn || stepPrompt?.content || '')
      : (stepPrompt?.content || '');
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
      const response = await postChatCompletion(setting, {
        model: setting.model,
        temperature: 0.75,
        messages: [
          { role: 'system', content: `${engineStepPrompt}\n${languageInstruction(sessionLanguage)}` },
          {
            role: 'user',
            content: JSON.stringify({
              language: sessionLanguage,
              outputLanguage: languageName(sessionLanguage),
              minuteFrom: session.currentMinute,
              minuteTo: engineResult.nextMinute,
              matchTotalMinutes: 90,
              playbackDurationMinutes: session.durationMinutes,
              score: {
                home: session.homeScore + engineResult.scoreDelta.home,
                away: session.awayScore + engineResult.scoreDelta.away
              },
              decidedEvents: engineResult.events,
              home: sessionLanguage === 'zh' ? withChineseBroadcastNames(session.homePlan) : session.homePlan,
              away: sessionLanguage === 'zh' ? withChineseBroadcastNames(session.awayPlan) : session.awayPlan,
              recentEvents: (session.events || []).slice(-12),
              recentBroadcastTexts: (session.events || []).slice(-8).map((event: any) => event.broadcastText || event.text).filter(Boolean)
            })
          }
        ]
      }, Number(process.env.LLM_MATCH_STEP_TIMEOUT_MS || 10000));
      narration = extractJson(response.data?.choices?.[0]?.message?.content || '');
    } catch (error) {
      console.error('AI duel narration failed, using engine text:', error);
    }

    const llmTexts = new Map<number, string>();
    const llmBroadcastTexts = new Map<number, string>();
    if (Array.isArray(narration.events)) {
      narration.events.forEach((event: any) => {
        const index = Number(event.index);
        if (Number.isInteger(index) && event.text) llmTexts.set(index, String(event.text));
        if (Number.isInteger(index) && event.broadcastText) llmBroadcastTexts.set(index, String(event.broadcastText));
      });
    }

    session.currentMinute = engineResult.nextMinute;
    session.homeScore += engineResult.scoreDelta.home;
    session.awayScore += engineResult.scoreDelta.away;
    session.events = [...(session.events || []), ...toVisibleAIMatchEvents(engineResult.events, llmTexts, llmBroadcastTexts)];
    session.statistics = mergeStatistics(session.statistics, engineResult.statisticsDelta || {});
    session.engineState = engineResult.engineState;
    session.status = engineResult.nextMinute >= 90 ? 'finished' : 'running';
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
      session.events = [...(session.events || []), ...toVisibleAIMatchEvents(result.events)];
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
      const language = normalizeLanguage(session.language);
      session.events = [...(session.events || []), {
        minute: 90,
        type: 'penalty',
        team: homePenaltyScore > awayPenaltyScore ? 'home' : 'away',
        key: true,
        text: language === 'en' ? `Penalty shootout completed automatically: ${homePenaltyScore}-${awayPenaltyScore}.` : `点球大战自动完成：${homePenaltyScore}-${awayPenaltyScore}。`,
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
      text: String(req.body.text || (normalizeLanguage(session.language) === 'en' ? 'Manual decision completed.' : '人工判定完成。')),
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

  static async markSaved(req: AuthRequest, res: Response) {
    const repository = AppDataSource.getRepository(AIMatchSession);
    const session = await repository.findOne({ where: { id: req.params.sessionId }, relations: ['user'] });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.user.id !== req.user!.id) return res.status(403).json({ error: 'Access denied' });
    session.status = 'saved';
    session.savedToMatch = true;
    res.json(await repository.save(session));
  }
}
