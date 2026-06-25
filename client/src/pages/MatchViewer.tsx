import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchAPI } from '../services/api';
import { Match } from '../types';
import { ArrowLeft, Play, Trophy, Clock, Target } from 'lucide-react';
import { TeamNameWithFlag } from '../utils/flags';

const hasPenaltyResult = (match: Match) => typeof match.homePenaltyScore === 'number' && typeof match.awayPenaltyScore === 'number';

const MatchViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetchMatch();
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!match) {
    return <div className="text-center py-8">比赛未找到</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to={`/tournaments/${match.tournament.id}`}
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回比赛安排
      </Link>

      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Match Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {match.tournament.name}
          </h1>
          <p className="text-gray-600">第 {match.round} 轮</p>
        </div>

        {/* Match Score */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex justify-center items-center space-x-8">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex justify-center"><TeamNameWithFlag team={match.homeTeam} fallback={match.homeSlot || '待定'} flagClassName="w-6 h-4 flex-shrink-0" /></h3>
              <div className="text-sm text-gray-600">
                {match.homeTeam ? <><p>进攻: {match.homeTeam.stats.attack}</p><p>防守: {match.homeTeam.stats.defense}</p><p>中场: {match.homeTeam.stats.midfield}</p></> : <p>球队待定</p>}
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {match.status === 'completed' 
                  ? `${match.homeScore} - ${match.awayScore}`
                  : 'VS'
                }
              </div>
              {match.status === 'completed' && hasPenaltyResult(match) && (
                <div className="text-sm text-gray-600 mt-1">
                  点球 {match.homePenaltyScore} - {match.awayPenaltyScore}
                </div>
              )}
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                match.status === 'completed' ? 'bg-green-100 text-green-800' :
                match.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {match.status === 'completed' ? '已结束' :
                 match.status === 'in_progress' ? '进行中' : '待开始'}
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex justify-center"><TeamNameWithFlag team={match.awayTeam} fallback={match.awaySlot || '待定'} flagClassName="w-6 h-4 flex-shrink-0" /></h3>
              <div className="text-sm text-gray-600">
                {match.awayTeam ? <><p>进攻: {match.awayTeam.stats.attack}</p><p>防守: {match.awayTeam.stats.defense}</p><p>中场: {match.awayTeam.stats.midfield}</p></> : <p>球队待定</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Match Actions */}
        {match.status === 'scheduled' && (
          <div className="text-center mb-6">
            <button
              onClick={handleSimulateMatch}
              disabled={simulating}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center mx-auto"
            >
              {simulating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  模拟中...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  开始模拟比赛
                </>
              )}
            </button>
          </div>
        )}

        {/* Match Events */}
        {match.status === 'completed' && match.events && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              比赛事件
            </h3>
            <div className="space-y-2">
              {match.events.map((event, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <span className="text-sm font-medium text-gray-600">
                      {event.minute}'
                    </span>
                  </div>
                  <div className="flex-grow">
                    <span className="text-sm text-gray-900">
                      {event.description}
                    </span>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    event.type === 'goal' ? 'bg-green-100 text-green-800' :
                    event.type === 'yellow_card' ? 'bg-yellow-100 text-yellow-800' :
                    event.type === 'red_card' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {event.type === 'goal' ? '进球' :
                     event.type === 'yellow_card' ? '黄牌' :
                     event.type === 'red_card' ? '红牌' : '事件'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match Commentary */}
        {match.status === 'completed' && match.commentary && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              比赛解说
            </h3>
            <div className="space-y-2">
              {match.commentary.split('\n').map((line, index) => (
                <p key={index} className="text-sm text-gray-700">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Match Statistics */}
        {match.status === 'completed' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              比赛统计
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2"><TeamNameWithFlag team={match.homeTeam} flagClassName="w-5 h-4 flex-shrink-0" /></h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>进球: {match.homeScore}</p>
                  <p>射门: {Math.floor(Math.random() * 20) + 5}</p>
                  <p>射正: {Math.floor(Math.random() * 10) + 2}</p>
                  <p>控球率: {Math.floor(Math.random() * 30) + 35}%</p>
                  <p>角球: {Math.floor(Math.random() * 8) + 2}</p>
                  <p>犯规: {Math.floor(Math.random() * 15) + 5}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2"><TeamNameWithFlag team={match.awayTeam} flagClassName="w-5 h-4 flex-shrink-0" /></h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>进球: {match.awayScore}</p>
                  <p>射门: {Math.floor(Math.random() * 20) + 5}</p>
                  <p>射正: {Math.floor(Math.random() * 10) + 2}</p>
                  <p>控球率: {Math.floor(Math.random() * 30) + 35}%</p>
                  <p>角球: {Math.floor(Math.random() * 8) + 2}</p>
                  <p>犯规: {Math.floor(Math.random() * 15) + 5}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back to Tournament */}
        <div className="text-center">
          <Link
            to={`/tournaments/${match.tournament.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            返回杯赛详情
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MatchViewer;
