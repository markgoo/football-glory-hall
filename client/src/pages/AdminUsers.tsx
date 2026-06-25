import React, { useEffect, useState } from 'react';
import { KeyRound, MoreVertical, RefreshCw, Shield, Trash2, UserCheck, UserX } from 'lucide-react';
import { adminAPI } from '../services/api';
import { User } from '../types';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

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
      setMenuUserId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || '更新用户状态失败');
    }
  };

  const toggleRole = async (targetUser: User) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      const response = await adminAPI.updateUser(targetUser.id, { role: nextRole });
      setUsers(users.map(item => item.id === targetUser.id ? response.data : item));
      setMenuUserId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || '更新用户角色失败');
    }
  };

  const openPasswordDialog = (targetUser: User) => {
    setPasswordUser(targetUser);
    setNewPassword('');
    setMenuUserId(null);
  };

  const submitPassword = async () => {
    if (!passwordUser || !newPassword) return;
    if (newPassword.length < 6) {
      alert('密码至少 6 位');
      return;
    }

    setSavingPassword(true);
    try {
      await adminAPI.resetPassword(passwordUser.id, newPassword);
      setPasswordUser(null);
      setNewPassword('');
      alert('密码已修改');
    } catch (err: any) {
      alert(err.response?.data?.error || '修改密码失败');
    } finally {
      setSavingPassword(false);
    }
  };

  const deleteUser = async (targetUser: User) => {
    if (!window.confirm(`确定删除用户 ${targetUser.username} 吗？该用户会被停用并隐藏，历史数据会保留。`)) return;

    try {
      await adminAPI.deleteUser(targetUser.id);
      setUsers(users.filter(item => item.id !== targetUser.id));
      setMenuUserId(null);
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">功能</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setMenuUserId(menuUserId === item.id ? null : item.id)}
                      className="text-left"
                    >
                      <div className="font-medium text-gray-900 hover:text-blue-700">{item.username}</div>
                      <div className="text-sm text-gray-500">{item.email}</div>
                    </button>
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
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={() => setMenuUserId(menuUserId === item.id ? null : item.id)}
                        className="p-2 rounded hover:bg-gray-100"
                        title="功能"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-700" />
                      </button>
                      {menuUserId === item.id && (
                        <div className="absolute right-0 z-20 mt-2 w-44 rounded border bg-white py-1 shadow-lg">
                          <button onClick={() => openPasswordDialog(item)} className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <KeyRound className="w-4 h-4 mr-2" />
                            修改密码
                          </button>
                          <button onClick={() => toggleRole(item)} disabled={item.username === 'admin'} className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400">
                            <Shield className="w-4 h-4 mr-2 text-blue-700" />
                            {item.role === 'admin' ? '设为普通用户' : '设为管理员'}
                          </button>
                          <button onClick={() => toggleActive(item)} disabled={item.username === 'admin'} className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400">
                            {item.isActive ? <UserX className="w-4 h-4 mr-2 text-red-700" /> : <UserCheck className="w-4 h-4 mr-2 text-green-700" />}
                            {item.isActive ? '停用用户' : '启用用户'}
                          </button>
                          <button onClick={() => deleteUser(item)} disabled={item.username === 'admin'} className="flex w-full items-center px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-400">
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除用户
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">修改密码</h2>
            <p className="mt-1 text-sm text-gray-600">为 {passwordUser.username} 设置新密码。</p>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="input mt-4"
              placeholder="输入新密码，至少 6 位"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPasswordUser(null)} className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">
                取消
              </button>
              <button type="button" onClick={submitPassword} disabled={savingPassword || newPassword.length < 6} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {savingPassword ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
