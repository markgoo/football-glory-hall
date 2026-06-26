import React, { useEffect, useState } from 'react';
import { llmAPI } from '../services/api';

type Prompt = { id: string; key: string; title: string; content: string; isActive: boolean };
type GlobalSetting = { apiBaseUrl: string; model: string; voiceEnabled: boolean; isGlobalEnabled: boolean; hasApiKey: boolean };

const AdminLLM: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [globalSetting, setGlobalSetting] = useState<GlobalSetting>({ apiBaseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', voiceEnabled: false, isGlobalEnabled: false, hasApiKey: false });
  const [globalApiKey, setGlobalApiKey] = useState('');
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    const [promptsResponse, globalResponse] = await Promise.all([llmAPI.getPrompts(), llmAPI.getGlobalSettings()]);
    setPrompts(promptsResponse.data);
    setGlobalSetting({
      apiBaseUrl: globalResponse.data?.apiBaseUrl || 'https://api.openai.com/v1',
      model: globalResponse.data?.model || 'gpt-4o-mini',
      voiceEnabled: !!globalResponse.data?.voiceEnabled,
      isGlobalEnabled: !!globalResponse.data?.isGlobalEnabled,
      hasApiKey: !!globalResponse.data?.hasApiKey
    });
  };

  useEffect(() => {
    void load();
  }, []);

  const updatePrompt = (key: string, patch: Partial<Prompt>) => {
    setPrompts(current => current.map(prompt => prompt.key === key ? { ...prompt, ...patch } : prompt));
  };

  const saveGlobal = async () => {
    if (!globalSetting.apiBaseUrl || !globalSetting.model || (globalSetting.isGlobalEnabled && !globalSetting.hasApiKey && !globalApiKey)) {
      alert('开启全局 AI 时需要填写 API 地址、模型和 API Key');
      return;
    }
    setSavingGlobal(true);
    try {
      const response = await llmAPI.saveGlobalSettings({ ...globalSetting, apiKey: globalApiKey || undefined });
      setGlobalSetting({
        apiBaseUrl: response.data.apiBaseUrl,
        model: response.data.model,
        voiceEnabled: !!response.data.voiceEnabled,
        isGlobalEnabled: !!response.data.isGlobalEnabled,
        hasApiKey: !!response.data.hasApiKey
      });
      setGlobalApiKey('');
      alert('全局 AI 配置已保存');
    } catch (error: any) {
      alert(error.response?.data?.error || '保存失败');
    } finally {
      setSavingGlobal(false);
    }
  };

  const savePrompt = async (prompt: Prompt) => {
    setSavingKey(prompt.key);
    try {
      const response = await llmAPI.updatePrompt(prompt.key, {
        title: prompt.title,
        content: prompt.content,
        isActive: prompt.isActive
      });
      updatePrompt(prompt.key, response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || '保存失败');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LLM 管理</h1>
        <p className="mt-2 text-sm text-gray-600">维护 AI 对决的全局配置和提示词模板。普通用户没有个人配置时，会自动使用已开启的全局 AI 配置。</p>
      </div>

      <div className="mb-6 rounded-lg bg-white p-5 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">全局 AI 配置</h2>
            <p className="mt-1 text-sm text-gray-600">开启后，未配置个人 API 的用户也可以使用 AI 对决。</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={globalSetting.isGlobalEnabled} onChange={event => setGlobalSetting(current => ({ ...current, isGlobalEnabled: event.target.checked }))} />
            开启全局 AI
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">API 地址</span>
            <input className="input mt-1" value={globalSetting.apiBaseUrl} onChange={event => setGlobalSetting(current => ({ ...current, apiBaseUrl: event.target.value }))} placeholder="https://api.openai.com/v1" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">模型</span>
            <input className="input mt-1" value={globalSetting.model} onChange={event => setGlobalSetting(current => ({ ...current, model: event.target.value }))} placeholder="gpt-4o-mini" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-gray-700">API Key {globalSetting.hasApiKey && <span className="text-green-700">已保存</span>}</span>
            <input className="input mt-1" type="password" value={globalApiKey} onChange={event => setGlobalApiKey(event.target.value)} placeholder={globalSetting.hasApiKey ? '留空则不修改当前 Key' : '请输入 API Key'} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={globalSetting.voiceEnabled} onChange={event => setGlobalSetting(current => ({ ...current, voiceEnabled: event.target.checked }))} />
            默认开启浏览器语音播报
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveGlobal} disabled={savingGlobal} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
            {savingGlobal ? '保存中...' : '保存全局配置'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {prompts.map(prompt => (
          <div key={prompt.key} className="rounded-lg bg-white p-5 shadow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase text-gray-500">{prompt.key}</div>
                <input className="mt-1 w-full text-lg font-semibold text-gray-900 outline-none" value={prompt.title} onChange={event => updatePrompt(prompt.key, { title: event.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={prompt.isActive} onChange={event => updatePrompt(prompt.key, { isActive: event.target.checked })} />
                启用
              </label>
            </div>
            <textarea className="mt-4 min-h-[150px] w-full rounded border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none" value={prompt.content} onChange={event => updatePrompt(prompt.key, { content: event.target.value })} />
            <div className="mt-3 flex justify-end">
              <button onClick={() => savePrompt(prompt)} disabled={savingKey === prompt.key} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
                {savingKey === prompt.key ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLLM;
