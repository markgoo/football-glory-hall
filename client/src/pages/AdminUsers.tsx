import React, { useEffect, useState } from 'react';
import { Shield, RefreshCw, Trash2, UserCheck, UserX } from 'lucide-react';
import { adminAPI } from '../services/api';
import { User } from '../types';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载用户失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleActive = async (targetUser: User) => {
    try {
      const response = await adminAPI.updateUser(targetUser.id, { isActive: !targetUser.isActive });
      setUsers(users.map(item => item.id === targetUser.id ? response.data : item));
    } catch (err: any) {
      alert(err.response?.data?.error || '更新用户状态失败');
    }
  };

  const toggleRole = async (targetUser: User) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      const response = await adminAPI.updateUser(targetUser.id, { role: nextRole });
      setUsers(users.map(item => item.id === targetUser.id ? response.data : item));
    } catch (err: any) {
      alert(err.response?.data?.error || '更新用户角色失败');
    }
  };

  const resetPassword = async (targetUser: User) => {
    const password = window.prompt(`为 ${targetUser.username} 设置新密码`, 'Admin@123456');
    if (!password) return;

    try {
      await adminAPI.resetPassword(targetUser.id, password);
      alert('密码已重置');
    } catch (err: any) {
      alert(err.response?.data?.error || '重置密码失败');
    }
  };

  const deleteUser = async (targetUser: User) => {
    if (!window.confirm(`确定删除用户 ${targetUser.username} 吗？该用户将被停用并从列表隐藏，历史数据会保留。`)) return;

    try {
      await adminAPI.deleteUser(targetUser.id);
      setUsers(users.filter(item => item.id !== targetUser.id));
    } catch (err: any) {
      alert(err.response?.data?.error || '删除用户失败');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-600 mt-1">管理系统账号、角色、状态和密码。</p>
        </div>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center px-4 py-2 rounded bg-gray-900 text-white hover:bg-gray-800"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">加载中...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.username}</div>
                    <div className="text-sm text-gray-500">{item.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={item.role === 'admin' ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                      {item.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={item.isActive ? 'text-green-700' : 'text-red-700'}>
                      {item.isActive ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => toggleRole(item)} className="p-2 rounded hover:bg-blue-50" title="切换角色">
                        <Shield className="w-4 h-4 text-blue-700" />
                      </button>
                      <button onClick={() => toggleActive(item)} className="p-2 rounded hover:bg-green-50" title="启用或停用">
                        {item.isActive ? <UserX className="w-4 h-4 text-red-700" /> : <UserCheck className="w-4 h-4 text-green-700" />}
                      </button>
                      <button onClick={() => resetPassword(item)} className="p-2 rounded hover:bg-gray-100" title="重置密码">
                        <RefreshCw className="w-4 h-4 text-gray-700" />
                      </button>
                      <button onClick={() => deleteUser(item)} className="p-2 rounded hover:bg-red-50" title="删除用户">
                        <Trash2 className="w-4 h-4 text-red-700" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
