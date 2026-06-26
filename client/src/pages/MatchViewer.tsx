import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Play, Target, Trophy } from 'lucide-react';
import { matchAPI } from '../services/api';
import { Match } from '../types';
import { TeamNameWithFlag, getTeamDisplayName } from '../utils/flags';
import { useI18n } from '../contexts/I18nContext';

const hasPenaltyResult = (match: Match) => typeof match.homePenaltyScore === 'number' && typeof match.awayPenaltyScore === 'number';

const eventTypeLabel = (type: string | undefined, language: 'zh' | 'en') => {
  const labels: Record<string, { zh: string; en: string }> = {
    goal: { zh: '进球', en: 'Goal' },
    yellow_card: { zh: '黄牌', en: 'Yellow card' },
    red_card: { zh: '红牌', en: 'Red card' },
    chance: { zh: '机会', en: 'Chance' },
    save: { zh: '扑救', en: 'Save' },
    penalty: { zh: '点球', en: 'Penalty' },
    card: { zh: '牌', en: 'Card' },
    injury: { zh: '伤停', en: 'Injury' }
  };
  return labels[type || '']?.[language] || (language === 'en' ? 'Event' : '事件');
};

const cleanEventText = (value: string) => value
  .replace(/^上帝摇骰子判定[:：]\s*/, '')
  .replace(/^God dice decision:\s*/i, '')
  .replace(/[{}[\]"“”]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const eventText = (event: any, match: Match | undefined, language: 'zh' | 'en') => {
  const rawText = language === 'en' ? (event?.description || event?.text) : (event?.descriptionZh || event?.text || event?.description);
  let value = rawText ? cleanEventText(String(rawText)) : '';
  if (language === 'zh' && match?.manualDetails?.source === 'real_sync' && event?.type === 'goal') {
    const team = event.team === 'away' ? match.awayTeam : event.team === 'home' ? match.homeTeam : undefined;
    value = `${getTeamDisplayName(team, language)} 进球：${cleanEventText(String(event.player || '未知球员'))}`;
  }
  if (language === 'en' && match?.manualDetails?.source === 'real_sync' && event?.type === 'goal') {
    const team = event.team === 'away' ? match.awayTeam : event.team === 'home' ? match.homeTeam : undefined;
    value = `${getTeamDisplayName(team, language)} goal: ${cleanEventText(String(event.player || 'Unknown player'))}`;
  }
  if (value && event?.player && !/\d+号/.test(event.player)) {
    const plan = event.team === 'away' ? match?.manualDetails?.awayPlan : event.team === 'home' ? match?.manualDetails?.homePlan : undefined;
    const player = Array.isArray(plan?.lineup) ? plan.lineup.find((item: any) => item.name === event.player) : undefined;
    if (player?.number && value.includes(event.player)) value = value.replace(event.player, language === 'en' ? `#${player.number} ${event.player}` : `${player.number}号 ${event.player}`);
  }
  if (value) return value;
  return [event?.team, event?.player, eventTypeLabel(event?.type, language)].filter(Boolean).join(' · ') || (language === 'en' ? 'Match event' : '比赛事件');
};

const displayPlayerName = (player: any, language: 'zh' | 'en') => {
  if (language === 'zh') {
    if (player?.nameZh) return player.nameZh;
    const raw = String(player?.name || player?.nameEn || '').trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    const surname = parts.length > 1 ? parts[parts.length - 1] : raw;
    return player?.number ? `${player.number}号 ${surname}` : surname;
  }
  return player?.nameEn || player?.name || player?.nameZh || '';
};

const displayPosition = (position: string | undefined, language: 'zh' | 'en') => {
  if (language === 'zh') return position || '-';
  const map: Record<string, string> = { '门将': 'Goalkeeper', '后卫': 'Defender', '中场': 'Midfielder', '前锋': 'Forward', '球员': 'Player' };
  return map[position || ''] || position || '-';
};

const displayCommentaryLine = (line: string, language: 'zh' | 'en') => {
  const cleaned = cleanEventText(line);
  if (language === 'en' && cleaned === '已同步真实比赛结果') return 'Real match result synced';
  return cleaned;
};

const MatchViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useI18n();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    void fetchMatch();
  }, [id]);

  const fetchMatch = async () => {
    if (!id) return;
    try {
      const response = await matchAPI.getById(id);
      setMatch(response.data);
    } catch (error) {
      console.error('Failed to fetch match:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateMatch = async () => {
    if (!id) return;
    setSimulating(true);
    try {
      const response = await matchAPI.simulate(id);
      setMatch(response.data.match);
    } catch (error) {
      console.error('Failed to simulate match:', error);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!match) {
    return <div className="py-8 text-center">{language === 'en' ? 'Match not found' : '比赛未找到'}</div>;
  }

  const homeStats = match.homeTeam?.stats;
  const awayStats = match.awayTeam?.stats;

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={`/tournaments/${match.tournament.id}#match-schedule`} className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('match.backToSchedule')}
      </Link>

      <div className="rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">{match.tournament.name}</h1>
          <p className="text-gray-600">{t('match.round', { round: match.round })}</p>
        </div>

        <div className="mb-6 rounded-lg bg-gray-50 p-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <h3 className="mb-2 flex justify-center text-xl font-bold text-gray-900">
                <TeamNameWithFlag team={match.homeTeam} fallback={match.homeSlot || (language === 'en' ? 'TBD' : '待定')} flagClassName="h-4 w-6 flex-shrink-0" />
              </h3>
              <div className="text-sm text-gray-600">
                {homeStats ? (
                  <>
                    <p>{t('match.attack')}: {homeStats.attack}</p>
                    <p>{t('match.defense')}: {homeStats.defense}</p>
                    <p>{t('match.midfield')}: {homeStats.midfield}</p>
                  </>
                ) : (
                  <p>{t('match.pendingTeam')}</p>
                )}
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {match.status === 'completed' ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
              </div>
              {match.status === 'completed' && hasPenaltyResult(match) && (
                <div className="mt-1 text-sm text-gray-600">{t('match.penalties')} {match.homePenaltyScore} - {match.awayPenaltyScore}</div>
              )}
              <div className={`mt-2 inline-flex items-center rounded-full px-2 py-1 text-xs ${
                match.status === 'completed' ? 'bg-green-100 text-green-800' :
                match.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {match.status === 'completed' ? t('match.completed') : match.status === 'in_progress' ? t('match.inProgress') : t('match.scheduled')}
              </div>
              {(match.resultMode === 'ai' || match.resultMode === 'manual') && (
                <div className="mt-2 flex justify-center">
                  {match.resultMode === 'ai' && <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">AI</span>}
                  {match.resultMode === 'manual' && <span className="rounded bg-green-300 px-2 py-0.5 text-xs font-bold text-black">{language === 'en' ? 'God Dice' : '上帝摇骰子'}</span>}
                </div>
              )}
            </div>

            <div className="text-center">
              <h3 className="mb-2 flex justify-center text-xl font-bold text-gray-900">
                <TeamNameWithFlag team={match.awayTeam} fallback={match.awaySlot || (language === 'en' ? 'TBD' : '待定')} flagClassName="h-4 w-6 flex-shrink-0" />
              </h3>
              <div className="text-sm text-gray-600">
                {awayStats ? (
                  <>
                    <p>{t('match.attack')}: {awayStats.attack}</p>
                    <p>{t('match.defense')}: {awayStats.defense}</p>
                    <p>{t('match.midfield')}: {awayStats.midfield}</p>
                  </>
                ) : (
                  <p>{t('match.pendingTeam')}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {match.status === 'scheduled' && (
          <div className="mb-6 text-center">
            <button onClick={handleSimulateMatch} disabled={simulating} className="mx-auto flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50">
              {simulating ? <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" /> : <Play className="mr-2 h-5 w-5" />}
              {simulating ? t('match.simulating') : t('match.startSimulation')}
            </button>
          </div>
        )}

        {match.status === 'completed' && Array.isArray(match.events) && match.events.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
              <Trophy className="mr-2 h-5 w-5" />
              {t('match.events')}
            </h3>
            <div className="space-y-2">
              {match.events.map((event: any, index) => (
                <div key={index} className="flex items-start gap-4 rounded-lg bg-gray-50 p-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <span className="text-sm font-medium text-gray-600">{event.minute}'</span>
                  </div>
                  <div className="min-w-0 flex-grow">
                    <span className="text-sm text-gray-900">{eventText(event, match, language)}</span>
                  </div>
                  <div className={`flex-shrink-0 rounded-full px-2 py-1 text-xs ${
                    event.type === 'goal' ? 'bg-green-100 text-green-800' :
                    event.type === 'yellow_card' ? 'bg-yellow-100 text-yellow-800' :
                    event.type === 'red_card' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {eventTypeLabel(event.type, language)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {match.status === 'completed' && match.commentary && (
          <div className="mb-6">
            <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
              <Clock className="mr-2 h-5 w-5" />
              {t('match.commentary')}
            </h3>
            <div className="space-y-2">
              {match.commentary.split('\n').filter(Boolean).map((line, index) => (
                <p key={index} className="text-sm text-gray-700">{displayCommentaryLine(line, language)}</p>
              ))}
            </div>
          </div>
        )}

        {match.status === 'completed' && match.manualDetails?.realLineups && (
          <div className="mb-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('match.lineups')}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {(['home', 'away'] as const).map(side => {
                const lineup = match.manualDetails.realLineups?.[side];
                const players = Array.isArray(lineup?.players) ? lineup.players : [];
                return (
                  <div key={side} className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-3 font-medium text-gray-900">{getTeamDisplayName(side === 'home' ? match.homeTeam : match.awayTeam, language, lineup?.teamName)}</h4>
                    {players.length === 0 ? (
                      <p className="text-sm text-gray-500">{t('match.noRealLineup')}</p>
                    ) : (
                      <div className="space-y-1">
                        {players.map((player: any, index: number) => (
                          <div key={`${side}-${player.name}-${index}`} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-8 rounded bg-white px-1 py-0.5 text-center text-xs font-semibold text-gray-600">{player.number || index + 1}</span>
                            <span className="min-w-0 flex-1 truncate">{displayPlayerName(player, language)}</span>
                            <span className="text-xs text-gray-500">{displayPosition(player.position, language)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {match.status === 'completed' && (
          <div className="mb-6">
            <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
              <Target className="mr-2 h-5 w-5" />
              {t('match.statistics')}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 font-medium text-gray-900"><TeamNameWithFlag team={match.homeTeam} flagClassName="h-4 w-5 flex-shrink-0" /></h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>{t('match.goals')}: {match.homeScore}</p>
                  <p>{t('match.shots')}: {match.manualDetails?.statistics?.homeShots ?? '-'}</p>
                  <p>{t('match.shotsOnTarget')}: {match.manualDetails?.statistics?.homeShotsOnTarget ?? '-'}</p>
                  <p>{t('match.corners')}: {match.manualDetails?.statistics?.homeCorners ?? '-'}</p>
                  <p>{t('match.fouls')}: {match.manualDetails?.statistics?.homeFouls ?? '-'}</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 font-medium text-gray-900"><TeamNameWithFlag team={match.awayTeam} flagClassName="h-4 w-5 flex-shrink-0" /></h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>{t('match.goals')}: {match.awayScore}</p>
                  <p>{t('match.shots')}: {match.manualDetails?.statistics?.awayShots ?? '-'}</p>
                  <p>{t('match.shotsOnTarget')}: {match.manualDetails?.statistics?.awayShotsOnTarget ?? '-'}</p>
                  <p>{t('match.corners')}: {match.manualDetails?.statistics?.awayCorners ?? '-'}</p>
                  <p>{t('match.fouls')}: {match.manualDetails?.statistics?.awayFouls ?? '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <Link to={`/tournaments/${match.tournament.id}#match-schedule`} className="text-blue-600 hover:text-blue-800">{t('match.backToSchedule')}</Link>
        </div>
      </div>
    </div>
  );
};

export default MatchViewer;
