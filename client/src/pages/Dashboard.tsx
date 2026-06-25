import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTournaments } from '../contexts/TournamentContext';
import { Trophy, Calendar, Users, TrendingUp, Shield } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { tournaments } = useTournaments();

  const activeTournaments = tournaments.filter(t => t.status === 'active');
  const completedTournaments = tournaments.filter(t => t.status === 'completed');
  const draftTournaments = tournaments.filter(t => t.status === 'draft');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          欢迎回来，{user?.username}！
        </h1>
        <p className="text-gray-600">这里是你的足球帝国指挥中心</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Trophy className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总杯赛数</p>
              <p className="text-2xl font-bold text-gray-900">{tournaments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">进行中</p>
              <p className="text-2xl font-bold text-gray-900">{activeTournaments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">已完成</p>
              <p className="text-2xl font-bold text-gray-900">{completedTournaments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">草稿</p>
              <p className="text-2xl font-bold text-gray-900">{draftTournaments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <Link
            to="/tournaments/new"
            className="flex items-center justify-center p-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="text-center">
              <Trophy className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-blue-600 font-medium">创建新杯赛</p>
            </div>
          </Link>

          <Link
            to="/tournaments"
            className="flex items-center justify-center p-4 bg-green-50 border-2 border-dashed border-green-300 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="text-center">
              <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-600 font-medium">查看杯赛</p>
            </div>
          </Link>

          <Link
            to="/glory-hall"
            className="flex items-center justify-center p-4 bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <div className="text-center">
              <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-purple-600 font-medium">荣耀殿堂</p>
            </div>
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin/users"
              className="flex items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="text-center">
                <Shield className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-700 font-medium">用户管理</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">最近活动</h2>
          <div className="space-y-4">
            {tournaments.slice(0, 5).map((tournament) => (
              <div key={tournament.id} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{tournament.name}</h3>
                    <p className="text-sm text-gray-600">{tournament.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    tournament.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : tournament.status === 'completed'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tournament.status === 'active' ? '进行中' : 
                     tournament.status === 'completed' ? '已完成' : '草稿'}
                  </span>
                </div>
              </div>
            ))}
            {tournaments.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                还没有杯赛，去创建一个吧！
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">即将开始的比赛</h2>
          <div className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>暂无即将开始的比赛</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
