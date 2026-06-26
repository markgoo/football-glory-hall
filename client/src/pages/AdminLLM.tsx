import React, { useEffect, useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { adminAPI, llmAPI } from '../services/api';

type Prompt = { id: string; key: string; title: string; titleEn?: string; content: string; contentEn?: string; isActive: boolean };
type GlobalSetting = { apiBaseUrl: string; model: string; voiceEnabled: boolean; thinkingEnabled: boolean; reasoningEffort: string; isGlobalEnabled: boolean; hasApiKey: boolean };
type PromptLanguage = 'zh' | 'en';

const AdminLLM: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [globalSetting, setGlobalSetting] = useState<GlobalSetting>({ apiBaseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', voiceEnabled: false, thinkingEnabled: false, reasoningEffort: '', isGlobalEnabled: false, hasApiKey: false });
  const [globalApiKey, setGlobalApiKey] = useState('');
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [promptLanguage, setPromptLanguage] = useState<PromptLanguage>('zh');
  const [cacheStats, setCacheStats] = useState<{ apiCacheCount: number; imageCacheFiles: number } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const { t } = useI18n();

  const load = async () => {
    const [promptsResponse, globalResponse, cacheResponse] = await Promise.all([llmAPI.getPrompts(), llmAPI.getGlobalSettings(), adminAPI.getFootballCache()]);
    setPrompts(promptsResponse.data);
    setCacheStats(cacheResponse.data);
    setGlobalSetting({
      apiBaseUrl: globalResponse.data?.apiBaseUrl || 'https://api.openai.com/v1',
      model: globalResponse.data?.model || 'gpt-4o-mini',
      voiceEnabled: !!globalResponse.data?.voiceEnabled,
      thinkingEnabled: !!globalResponse.data?.thinkingEnabled,
      reasoningEffort: globalResponse.data?.reasoningEffort || '',
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

  const getPromptTitle = (prompt: Prompt) => promptLanguage === 'en' ? (prompt.titleEn || prompt.title) : prompt.title;
  const getPromptContent = (prompt: Prompt) => promptLanguage === 'en' ? (prompt.contentEn || prompt.content) : prompt.content;
  const updateLocalizedPrompt = (key: string, field: 'title' | 'content', value: string) => {
    if (promptLanguage === 'en') {
      updatePrompt(key, field === 'title' ? { titleEn: value } : { contentEn: value });
    } else {
      updatePrompt(key, field === 'title' ? { title: value } : { content: value });
    }
  };

  const saveGlobal = async () => {
    if (!globalSetting.apiBaseUrl || !globalSetting.model || (globalSetting.isGlobalEnabled && !globalSetting.hasApiKey && !globalApiKey)) {
      alert(t('llmAdmin.globalRequired'));
      return;
    }

    setSavingGlobal(true);
    try {
      const response = await llmAPI.saveGlobalSettings({ ...globalSetting, apiKey: globalApiKey || undefined });
      setGlobalSetting({
        apiBaseUrl: response.data.apiBaseUrl,
        model: response.data.model,
        voiceEnabled: !!response.data.voiceEnabled,
        thinkingEnabled: !!response.data.thinkingEnabled,
        reasoningEffort: response.data.reasoningEffort || '',
        isGlobalEnabled: !!response.data.isGlobalEnabled,
        hasApiKey: !!response.data.hasApiKey
      });
      setGlobalApiKey('');
      alert(t('llmAdmin.globalSaved'));
    } catch (error: any) {
      alert(error.response?.data?.error || t('llm.saveFailed'));
    } finally {
      setSavingGlobal(false);
    }
  };

  const savePrompt = async (prompt: Prompt) => {
    setSavingKey(`${promptLanguage}:${prompt.key}`);
    try {
      const response = await llmAPI.updatePrompt(prompt.key, {
        title: getPromptTitle(prompt),
        content: getPromptContent(prompt),
        isActive: prompt.isActive,
        language: promptLanguage
      });
      updatePrompt(prompt.key, response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || t('llm.saveFailed'));
    } finally {
      setSavingKey(null);
    }
  };

  const clearFootballCache = async () => {
    if (!window.confirm(t('llmAdmin.clearFootballCacheConfirm'))) return;
    setClearingCache(true);
    try {
      await adminAPI.clearFootballCache();
      const response = await adminAPI.getFootballCache();
      setCacheStats(response.data);
      alert(t('llmAdmin.footballCacheCleared'));
    } catch (error: any) {
      alert(error.response?.data?.error || t('llmAdmin.clearFootballCacheFailed'));
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('llmAdmin.title')}</h1>
        <p className="mt-2 text-sm text-gray-600">{t('llmAdmin.subtitle')}</p>
      </div>

      <div className="mb-6 rounded-lg bg-white p-5 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('llmAdmin.globalSettings')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('llmAdmin.globalDescription')}</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={globalSetting.isGlobalEnabled} onChange={event => setGlobalSetting(current => ({ ...current, isGlobalEnabled: event.target.checked }))} />
            {t('llmAdmin.enableGlobal')}
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">{t('llm.apiBaseUrl')}</span>
            <input className="input mt-1" value={globalSetting.apiBaseUrl} onChange={event => setGlobalSetting(current => ({ ...current, apiBaseUrl: event.target.value }))} placeholder="https://api.openai.com/v1" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">{t('llm.model')}</span>
            <input className="input mt-1" value={globalSetting.model} onChange={event => setGlobalSetting(current => ({ ...current, model: event.target.value }))} placeholder="gpt-4o-mini" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-gray-700">
              {t('llm.apiKey')} {globalSetting.hasApiKey && <span className="text-green-700">{t('common.saved')}</span>}
            </span>
            <input className="input mt-1" type="password" value={globalApiKey} onChange={event => setGlobalApiKey(event.target.value)} placeholder={globalSetting.hasApiKey ? t('llm.keepKey') : t('llm.enterKey')} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={globalSetting.voiceEnabled} onChange={event => setGlobalSetting(current => ({ ...current, voiceEnabled: event.target.checked }))} />
            {t('llm.voiceEnabled')}
          </label>
          <div className="rounded border border-gray-200 bg-gray-50 p-4 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={globalSetting.thinkingEnabled} onChange={event => setGlobalSetting(current => ({ ...current, thinkingEnabled: event.target.checked }))} />
              思考模式
            </label>
            <p className="mt-1 text-xs text-gray-500">关闭时全局请求会发送 <code>{'{"thinking":{"type":"disabled"}}'}</code>；开启后可附加 OpenAI 兼容 <code>reasoning_effort</code>。</p>
            <label className="mt-3 block">
              <span className="text-sm font-medium text-gray-700">思考强度</span>
              <select className="input mt-1" value={globalSetting.reasoningEffort} onChange={event => setGlobalSetting(current => ({ ...current, reasoningEffort: event.target.value }))} disabled={!globalSetting.thinkingEnabled}>
                <option value="">默认 high</option>
                <option value="high">high</option>
                <option value="max">max</option>
              </select>
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveGlobal} disabled={savingGlobal} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
            {savingGlobal ? t('common.saving') : t('llmAdmin.saveGlobal')}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-lg bg-white p-5 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('llmAdmin.footballCache')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('llmAdmin.footballCacheDesc')}</p>
            <p className="mt-2 text-sm text-gray-700">
              {t('llmAdmin.apiCacheCount')}: {cacheStats?.apiCacheCount ?? '-'} · {t('llmAdmin.imageCacheFiles')}: {cacheStats?.imageCacheFiles ?? '-'}
            </p>
          </div>
          <button onClick={clearFootballCache} disabled={clearingCache} className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50">
            {clearingCache ? t('common.loading') : t('llmAdmin.clearFootballCache')}
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg bg-white p-4 shadow">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{promptLanguage === 'zh' ? '中文提示词' : 'English Prompts'}</h2>
          <p className="mt-1 text-sm text-gray-600">{promptLanguage === 'zh' ? 'AI 对决为中文界面用户使用这一套提示词。' : 'AI Duel uses these prompts when the user language is English.'}</p>
        </div>
        <div className="inline-flex overflow-hidden rounded border border-gray-300 text-sm">
          <button type="button" onClick={() => setPromptLanguage('zh')} className={`px-3 py-2 ${promptLanguage === 'zh' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>中文</button>
          <button type="button" onClick={() => setPromptLanguage('en')} className={`px-3 py-2 ${promptLanguage === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>English</button>
        </div>
      </div>

      <div className="space-y-4">
        {prompts.map(prompt => (
          <div key={`${promptLanguage}:${prompt.key}`} className="rounded-lg bg-white p-5 shadow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase text-gray-500">{prompt.key}</div>
                <input className="mt-1 w-full text-lg font-semibold text-gray-900 outline-none" value={getPromptTitle(prompt)} onChange={event => updateLocalizedPrompt(prompt.key, 'title', event.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={prompt.isActive} onChange={event => updatePrompt(prompt.key, { isActive: event.target.checked })} />
                {t('common.enabled')}
              </label>
            </div>
            <textarea className="mt-4 min-h-[150px] w-full rounded border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none" value={getPromptContent(prompt)} onChange={event => updateLocalizedPrompt(prompt.key, 'content', event.target.value)} />
            <div className="mt-3 flex justify-end">
              <button onClick={() => savePrompt(prompt)} disabled={savingKey === `${promptLanguage}:${prompt.key}`} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
                {savingKey === `${promptLanguage}:${prompt.key}` ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLLM;
