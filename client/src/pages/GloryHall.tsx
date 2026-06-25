import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Search, Crown, Medal, Award } from 'lucide-react';
import { historicalAPI } from '../services/api';
import { HistoricalRecord } from '../types';

const GloryHall: React.FC = () => {
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recordsResponse] = await Promise.all([
        historicalAPI.getAll(),
        historicalAPI.getUserRecords()
      ]);
      
      setRecords(recordsResponse.data);
      // For now, we'll use the basic stats from user records
      setStats({
        totalRecords: recordsResponse.data.length,
        userRecords: recordsResponse.data.length
      });
    } catch (error) {
      console.error('Failed to fetch glory hall data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchData();
      return;
    }

    try {
      const response = await historicalAPI.searchRecords(searchTerm);
      setRecords(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'tournament_winner':
        return <Crown className="w-5 h-5" />;
      case 'tournament_runner_up':
        return <Medal className="w-5 h-5" />;
      case 'best_team':
        return <Trophy className="w-5 h-5" />;
      case 'best_manager':
        return <Award className="w-5 h-5" />;
      default:
        return <Trophy className="w-5 h-5" />;
    }
  };

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'tournament_winner':
        return 'text-yellow-600 bg-yellow-50';
      case 'tournament_runner_up':
        return 'text-gray-600 bg-gray-50';
      case 'best_team':
        return 'text-blue-600 bg-blue-50';
      case 'best_manager':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <Trophy className="w-10 h-10 mr-3 text-yellow-500" />
          荣耀殿堂
        </h1>
        <p className="text-lg text-gray-600">
          永恒记录每个传奇瞬间，见证足球历史的书写
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总记录</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Crown className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">我的记录</p>
                <p className="text-2xl font-bold text-gray-900">{stats.userRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">今年记录</p>
                <p className="text-2xl font-bold text-gray-900">
                  {records.filter(r => r.year === new Date().getFullYear()).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Medal className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">最近记录</p>
                <p className="text-2xl font-bold text-gray-900">
                  {records.slice(0, 5).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <form onSubmit={handleSearch} className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索杯赛或冠军..."
              className="input w-full pl-10"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            搜索
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              fetchData();
            }}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
          >
            重置
          </button>
        </form>
      </div>

      {/* Records List */}
      <div className="space-y-6">
        {records.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无记录</h3>
            <p className="text-gray-600">完成你的第一个杯赛来创建记录！</p>
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getAchievementColor(record.achievementType)}`}>
                    {getAchievementIcon(record.achievementType)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{record.tournamentName}</h3>
                    <p className="text-sm text-gray-600">
                      {record.year}年 • {record.achievementType === 'tournament_winner' ? '冠军' : 
                        record.achievementType === 'tournament_runner_up' ? '亚军' : '荣誉记录'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{record.winner}</p>
                  <p className="text-sm text-gray-600">冠军</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">前三名</h4>
                  <div className="space-y-1">
                    {record.topTeams.map((team, index) => (
                      <div key={team} className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">
                          {index + 1}.
                        </span>
                        <span className="text-sm text-gray-900">{team}</span>
                        {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                        {index === 1 && <Medal className="w-4 h-4 text-gray-500" />}
                        {index === 2 && <Award className="w-4 h-4 text-orange-500" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">统计数据</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    {record.statistics?.totalMatches && (
                      <p>总比赛: {record.statistics.totalMatches}场</p>
                    )}
                    {record.statistics?.totalGoals && (
                      <p>总进球: {record.statistics.totalGoals}球</p>
                    )}
                    {record.statistics?.averageGoals && (
                      <p>场均进球: {record.statistics.averageGoals.toFixed(1)}球</p>
                    )}
                    {record.statistics?.participation && (
                      <p>参赛球队: {record.statistics.participation}支</p>
                    )}
                  </div>
                </div>
              </div>

              {record.description && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-700">{record.description}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  创建于 {new Date(record.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{record.year}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GloryHall;
