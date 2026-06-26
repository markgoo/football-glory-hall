import React, { useEffect, useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { llmAPI } from '../services/api';

const LLMSettings: React.FC = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    llmAPI.getSettings()
      .then(response => {
        if (response.data) {
          setApiBaseUrl(response.data.apiBaseUrl || 'https://api.openai.com/v1');
          setModel(response.data.model || 'gpt-4o-mini');
          setVoiceEnabled(!!response.data.voiceEnabled);
          setHasApiKey(!!response.data.hasApiKey);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!apiBaseUrl || !model || (!hasApiKey && !apiKey)) {
      alert(t('llm.required'));
      return;
    }

    setSaving(true);
    try {
      const response = await llmAPI.saveSettings({ apiBaseUrl, apiKey: apiKey || undefined, model, voiceEnabled });
      setHasApiKey(!!response.data.hasApiKey);
      setApiKey('');
      alert(t('llm.saved'));
    } catch (error: any) {
      alert(error.response?.data?.error || t('llm.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-12 text-center">{t('common.loading')}</div>;

  return (
    <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow">
      <h1 className="text-2xl font-bold text-gray-900">{t('llm.title')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t('llm.description')}</p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">{t('llm.apiBaseUrl')}</span>
          <input className="input mt-1" value={apiBaseUrl} onChange={event => setApiBaseUrl(event.target.value)} placeholder="https://api.openai.com/v1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {t('llm.apiKey')} {hasApiKey && <span className="text-green-700">{t('common.saved')}</span>}
          </span>
          <input className="input mt-1" type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={hasApiKey ? t('llm.keepKey') : t('llm.enterKey')} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">{t('llm.model')}</span>
          <input className="input mt-1" value={model} onChange={event => setModel(event.target.value)} placeholder="gpt-4o-mini" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={voiceEnabled} onChange={event => setVoiceEnabled(event.target.checked)} />
          {t('llm.voiceEnabled')}
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={save} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? t('common.saving') : t('llm.saveSettings')}
        </button>
      </div>
    </div>
  );
};

export default LLMSettings;
