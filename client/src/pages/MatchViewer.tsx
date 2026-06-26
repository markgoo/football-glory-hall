import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Play, Target, Trophy } from 'lucide-react';
import { matchAPI } from '../services/api';
import { Match } from '../types';
import { TeamNameWithFlag } from '../utils/flags';

const hasPenaltyResult = (match: Match) => typeof match.homePenaltyScore === 'number' && typeof match.awayPenaltyScore === 'number';

const eventTypeLabel = (type?: string) => {
  if (type === 'goal') return '进球';
  if (type === 'yellow_card') return '黄牌';
  if (type === 'red_card') return '红牌';
  if (type === 'chance') return '机会';
  if (type === 'save') return '扑救';
  if (type === 'penalty') return '点球';
  if (type === 'card') return '牌';
  if (type === 'injury') return '伤停';
  return '事件';
};

const eventText = (event: any) => {
  const text = event?.text || event?.description;
  if (text) return String(text).replace(/^上帝摇骰子判定[:：]\s*/, '');
  return [event?.team, event?.player, eventTypeLabel(event?.type)].filter(Boolean).join(' · ') || '比赛事件';
};

const MatchViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
    return <div className="py-8 text-center">比赛未找到</div>;
  }

  const homeStats = match.homeTeam?.stats;
  const awayStats = match.awayTeam?.stats;

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={`/tournaments/${match.tournament.id}#match-schedule`} className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800">
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回比赛安排
      </Link>

      <div className="rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">{match.tournament.name}</h1>
          <p className="text-gray-600">第 {match.round} 轮</p>
        </div>

        <div className="mb-6 rounded-lg bg-gray-50 p-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <h3 className="mb-2 flex justify-center text-xl font-bold text-gray-900">
                <TeamNameWithFlag team={match.homeTeam} fallback={match.homeSlot || '待定'} flagClassName="h-4 w-6 flex-shrink-0" />
              </h3>
              <div className="text-sm text-gray-600">
                {homeStats ? (
                  <>
                    <p>进攻: {homeStats.attack}</p>
                    <p>防守: {homeStats.defense}</p>
                    <p>中场: {homeStats.midfield}</p>
                  </>
                ) : (
                  <p>球队待定</p>
                )}
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {match.status === 'completed' ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
              </div>
              {match.status === 'completed' && hasPenaltyResult(match) && (
                <div className="mt-1 text-sm text-gray-600">点球 {match.homePenaltyScore} - {match.awayPenaltyScore}</div>
              )}
              <div className={`mt-2 inline-flex items-center rounded-full px-2 py-1 text-xs ${
                match.status === 'completed' ? 'bg-green-100 text-green-800' :
                match.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {match.status === 'completed' ? '已结束' : match.status === 'in_progress' ? '进行中' : '待开始'}
              </div>
              {(match.resultMode === 'ai' || match.resultMode === 'manual') && (
                <div className="mt-2 flex justify-center">
                  {match.resultMode === 'ai' && <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">AI</span>}
                  {match.resultMode === 'manual' && <span className="rounded bg-green-300 px-2 py-0.5 text-xs font-bold text-black">上帝摇骰子</span>}
                </div>
              )}
            </div>

            <div className="text-center">
              <h3 className="mb-2 flex justify-center text-xl font-bold text-gray-900">
                <TeamNameWithFlag team={match.awayTeam} fallback={match.awaySlot || '待定'} flagClassName="h-4 w-6 flex-shrink-0" />
              </h3>
              <div className="text-sm text-gray-600">
                {awayStats ? (
                  <>
                    <p>进攻: {awayStats.attack}</p>
                    <p>防守: {awayStats.defense}</p>
                    <p>中场: {awayStats.midfield}</p>
                  </>
                ) : (
                  <p>球队待定</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {match.status === 'scheduled' && (
          <div className="mb-6 text-center">
            <button onClick={handleSimulateMatch} disabled={simulating} className="mx-auto flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50">
              {simulating ? <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" /> : <Play className="mr-2 h-5 w-5" />}
              {simulating ? '模拟中...' : '开始模拟比赛'}
            </button>
          </div>
        )}

        {match.status === 'completed' && Array.isArray(match.events) && match.events.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
              <Trophy className="mr-2 h-5 w-5" />
              比赛事件
            </h3>
            <div className="space-y-2">
              {match.events.map((event: any, index) => (
                <div key={index} className="flex items-start gap-4 rounded-lg bg-gray-50 p-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <span className="text-sm font-medium text-gray-600">{event.minute}'</span>
                  </div>
                  <div className="min-w-0 flex-grow">
                    <span className="text-sm text-gray-900">{eventText(event)}</span>
                  </div>
                  <div className={`flex-shrink-0 rounded-full px-2 py-1 text-xs ${
                    event.type === 'goal' ? 'bg-green-100 text-green-800' :
                    event.type === 'yellow_card' ? 'bg-yellow-100 text-yellow-800' :
                    event.type === 'red_card' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {eventTypeLabel(event.type)}
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
              比赛解说
            </h3>
            <div className="space-y-2">
              {match.commentary.split('\n').filter(Boolean).map((line, index) => (
                <p key={index} className="text-sm text-gray-700">{line.replace(/^上帝摇骰子判定[:：]\s*/, '')}</p>
              ))}
            </div>
          </div>
        )}

        {match.status === 'completed' && (
          <div className="mb-6">
            <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
              <Target className="mr-2 h-5 w-5" />
              比赛统计
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 font-medium text-gray-900"><TeamNameWithFlag team={match.homeTeam} flagClassName="h-4 w-5 flex-shrink-0" /></h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>进球: {match.homeScore}</p>
                  <p>射门: {match.manualDetails?.statistics?.homeShots ?? '-'}</p>
                  <p>射正: {match.manualDetails?.statistics?.homeShotsOnTarget ?? '-'}</p>
                  <p>角球: {match.manualDetails?.statistics?.homeCorners ?? '-'}</p>
                  <p>犯规: {match.manualDetails?.statistics?.homeFouls ?? '-'}</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 font-medium text-gray-900"><TeamNameWithFlag team={match.awayTeam} flagClassName="h-4 w-5 flex-shrink-0" /></h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>进球: {match.awayScore}</p>
                  <p>射门: {match.manualDetails?.statistics?.awayShots ?? '-'}</p>
                  <p>射正: {match.manualDetails?.statistics?.awayShotsOnTarget ?? '-'}</p>
                  <p>角球: {match.manualDetails?.statistics?.awayCorners ?? '-'}</p>
                  <p>犯规: {match.manualDetails?.statistics?.awayFouls ?? '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <Link to={`/tournaments/${match.tournament.id}#match-schedule`} className="text-blue-600 hover:text-blue-800">返回比赛安排</Link>
        </div>
      </div>
    </div>
  );
};

export default MatchViewer;
