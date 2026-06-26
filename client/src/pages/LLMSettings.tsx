import React, { useEffect, useState } from 'react';
import { llmAPI } from '../services/api';

const LLMSettings: React.FC = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
      alert('请填写 API 地址、模型和 API Key');
      return;
    }
    setSaving(true);
    try {
      const response = await llmAPI.saveSettings({ apiBaseUrl, apiKey: apiKey || undefined, model, voiceEnabled });
      setHasApiKey(!!response.data.hasApiKey);
      setApiKey('');
      alert('AI 配置已保存');
    } catch (error: any) {
      alert(error.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12">加载中...</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-gray-900">AI 对决配置</h1>
      <p className="mt-2 text-sm text-gray-600">配置 OpenAI 兼容接口。API Key 会加密保存在后端，不会回显。</p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">API 地址</span>
          <input className="input mt-1" value={apiBaseUrl} onChange={event => setApiBaseUrl(event.target.value)} placeholder="https://api.openai.com/v1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">API Key {hasApiKey && <span className="text-green-700">已保存</span>}</span>
          <input className="input mt-1" type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={hasApiKey ? '留空则不修改现有 Key' : '请输入 API Key'} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">模型</span>
          <input className="input mt-1" value={model} onChange={event => setModel(event.target.value)} placeholder="gpt-4o-mini" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={voiceEnabled} onChange={event => setVoiceEnabled(event.target.checked)} />
          默认开启浏览器语音播报
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={save} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
};

export default LLMSettings;
