import React, { useEffect, useState } from 'react';
import { KeyRound, MoreVertical, RefreshCw, Shield, Trash2, UserCheck, UserX } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
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
  const { t } = useI18n();

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || t('adminUsers.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const toggleActive = async (targetUser: User) => {
    try {
      const response = await adminAPI.updateUser(targetUser.id, { isActive: !targetUser.isActive });
      setUsers(users.map(item => item.id === targetUser.id ? response.data : item));
      setMenuUserId(null);
    } catch (error: any) {
      alert(error.response?.data?.error || t('adminUsers.updateStatusFailed'));
    }
  };

  const toggleRole = async (targetUser: User) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      const response = await adminAPI.updateUser(targetUser.id, { role: nextRole });
      setUsers(users.map(item => item.id === targetUser.id ? response.data : item));
      setMenuUserId(null);
    } catch (error: any) {
      alert(error.response?.data?.error || t('adminUsers.updateRoleFailed'));
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
      alert(t('password.minLength'));
      return;
    }

    setSavingPassword(true);
    try {
      await adminAPI.resetPassword(passwordUser.id, newPassword);
      setPasswordUser(null);
      setNewPassword('');
      alert(t('password.saved'));
    } catch (error: any) {
      alert(error.response?.data?.error || t('password.failed'));
    } finally {
      setSavingPassword(false);
    }
  };

  const deleteUser = async (targetUser: User) => {
    if (!window.confirm(t('adminUsers.deleteConfirm', { name: targetUser.username }))) return;

    try {
      await adminAPI.deleteUser(targetUser.id);
      setUsers(users.filter(item => item.id !== targetUser.id));
      setMenuUserId(null);
    } catch (error: any) {
      alert(error.response?.data?.error || t('adminUsers.deleteFailed'));
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adminUsers.title')}</h1>
          <p className="mt-1 text-gray-600">{t('adminUsers.subtitle')}</p>
        </div>
        <button onClick={fetchUsers} className="inline-flex items-center rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </button>
      </div>

      {error && <div className="mb-4 rounded bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-600">{t('common.loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('adminUsers.user')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('adminUsers.role')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('adminUsers.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('adminUsers.createdAt')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {users.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => setMenuUserId(menuUserId === item.id ? null : item.id)} className="text-left">
                        <div className="font-medium text-gray-900 hover:text-blue-700">{item.username}</div>
                        <div className="text-sm text-gray-500">{item.email}</div>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={item.role === 'admin' ? 'font-medium text-blue-700' : 'text-gray-700'}>
                        {item.role === 'admin' ? t('adminUsers.admin') : t('adminUsers.normal')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={item.isActive ? 'text-green-700' : 'text-red-700'}>
                        {item.isActive ? t('common.enabled') : t('common.disabled')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button type="button" onClick={() => setMenuUserId(menuUserId === item.id ? null : item.id)} className="rounded p-2 hover:bg-gray-100" title={t('common.actions')}>
                          <MoreVertical className="h-4 w-4 text-gray-700" />
                        </button>
                        {menuUserId === item.id && (
                          <div className="absolute right-0 z-20 mt-2 w-44 rounded border bg-white py-1 shadow-lg">
                            <button onClick={() => openPasswordDialog(item)} className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <KeyRound className="mr-2 h-4 w-4" />
                              {t('password.title')}
                            </button>
                            <button onClick={() => toggleRole(item)} disabled={item.username === 'admin'} className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400">
                              <Shield className="mr-2 h-4 w-4 text-blue-700" />
                              {item.role === 'admin' ? t('adminUsers.setNormal') : t('adminUsers.setAdmin')}
                            </button>
                            <button onClick={() => toggleActive(item)} disabled={item.username === 'admin'} className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400">
                              {item.isActive ? <UserX className="mr-2 h-4 w-4 text-red-700" /> : <UserCheck className="mr-2 h-4 w-4 text-green-700" />}
                              {item.isActive ? t('adminUsers.disableUser') : t('adminUsers.enableUser')}
                            </button>
                            <button onClick={() => deleteUser(item)} disabled={item.username === 'admin'} className="flex w-full items-center px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-400">
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('adminUsers.deleteUser')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">{t('password.title')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('adminUsers.setPasswordFor', { name: passwordUser.username })}</p>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="input mt-4"
              placeholder={t('password.new')}
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPasswordUser(null)} className="rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={submitPassword} disabled={savingPassword || newPassword.length < 6} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
                {savingPassword ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
