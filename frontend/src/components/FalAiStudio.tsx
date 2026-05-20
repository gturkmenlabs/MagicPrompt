import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Input, SectionHeader, Select } from '@/components/ui';
import { useApiKeys } from '@/hooks/useApiKeys';
import { fetchFalModelsViaApi, generateFalImageViaApi, generateFalSpeechViaApi } from '@/services/falApi';

function isSpeechCategory(category: string): boolean {
  const normalized = category.toLowerCase();
  return normalized.includes('speech')
    || normalized.includes('audio')
    || normalized.includes('voice')
    || normalized.includes('tts');
}

function isImageCategory(category: string): boolean {
  const normalized = category.toLowerCase();
  return normalized.includes('image');
}

export default function FalAiStudio() {
  const { keys, setKey } = useApiKeys();
  const [draftKey, setDraftKey] = useState(keys.fal ?? '');

  const [imagePrompt, setImagePrompt] = useState('A cinematic cyberpunk city at sunset, ultra-detailed.');
  const [imageModel, setImageModel] = useState('fal-ai/flux/schnell');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [speechText, setSpeechText] = useState('Merhaba, bu ses fal.ai uzerinden olusturuldu.');
  const [speechModel, setSpeechModel] = useState('fal-ai/playai/tts');
  const [voice, setVoice] = useState('');
  const [speechLoading, setSpeechLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelQuery, setModelQuery] = useState('');
  const [allModels, setAllModels] = useState<Array<{ endpointId: string; displayName: string; category: string; status: string }>>([]);

  const [error, setError] = useState<string | null>(null);

  const activeKey = (keys.fal || '').trim();

  const handleSaveKey = () => {
    setKey('fal', draftKey.trim());
  };

  const loadModels = async (query = '') => {
    if (!activeKey) return;
    setModelsError(null);
    setModelsLoading(true);
    try {
      const { models } = await fetchFalModelsViaApi({
        apiKey: activeKey,
        status: 'all',
        q: query.trim() || undefined,
      });
      setAllModels(models);
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : 'Model listesi alinamadi');
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeKey) {
      setAllModels([]);
      return;
    }
    void loadModels('');
  }, [activeKey]);

  const imageModelOptions = useMemo(() => {
    const filtered = allModels.filter((m) => isImageCategory(m.category));
    const options = filtered.map((m) => ({
      value: m.endpointId,
      label: `${m.displayName} (${m.endpointId})`,
    }));
    if (!options.some((o) => o.value === imageModel)) {
      options.unshift({ value: imageModel, label: `${imageModel} (custom)` });
    }
    return options;
  }, [allModels, imageModel]);

  const speechModelOptions = useMemo(() => {
    const filtered = allModels.filter((m) => isSpeechCategory(m.category));
    const options = filtered.map((m) => ({
      value: m.endpointId,
      label: `${m.displayName} (${m.endpointId})`,
    }));
    if (!options.some((o) => o.value === speechModel)) {
      options.unshift({ value: speechModel, label: `${speechModel} (custom)` });
    }
    return options;
  }, [allModels, speechModel]);

  const handleGenerateImage = async () => {
    if (!activeKey) {
      setError('Fal.ai key gerekli.');
      return;
    }
    if (!imagePrompt.trim()) {
      setError('Image prompt bos olamaz.');
      return;
    }
    setError(null);
    setImageLoading(true);
    try {
      const { imageUrl: url } = await generateFalImageViaApi({
        apiKey: activeKey,
        modelId: imageModel.trim(),
        prompt: imagePrompt.trim(),
      });
      setImageUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image generation failed');
    } finally {
      setImageLoading(false);
    }
  };

  const handleGenerateSpeech = async () => {
    if (!activeKey) {
      setError('Fal.ai key gerekli.');
      return;
    }
    if (!speechText.trim()) {
      setError('Speech text bos olamaz.');
      return;
    }
    setError(null);
    setSpeechLoading(true);
    try {
      const { audioUrl: url } = await generateFalSpeechViaApi({
        apiKey: activeKey,
        modelId: speechModel.trim(),
        text: speechText.trim(),
        voice: voice.trim() || undefined,
      });
      setAudioUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speech generation failed');
    } finally {
      setSpeechLoading(false);
    }
  };

  return (
    <Card className="p-5">
      <SectionHeader
        eyebrow="fal.ai"
        title="Direct image and voice generation"
        description="Fal.ai key kaydet, sonra dogrudan bu panelden gorsel ve ses uret."
        actions={<Badge tone={activeKey ? 'success' : 'warning'}>{activeKey ? 'Key loaded' : 'Key missing'}</Badge>}
      />

      <div className="mt-5 grid gap-4">
        <Input
          label="fal.ai API key"
          type="password"
          value={draftKey}
          placeholder="key_id:key_secret"
          onChange={(event) => setDraftKey(event.target.value)}
          helper="Key bu tarayicida saklanir ve fal.ai isteklerinde dogrudan kullanilir."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={handleSaveKey}>Save key</Button>
          <Button variant="ghost" onClick={() => { setDraftKey(''); setKey('fal', ''); }}>Clear key</Button>
          <Button variant="secondary" onClick={() => void loadModels(modelQuery)} disabled={!activeKey || modelsLoading}>
            {modelsLoading ? 'Loading models...' : 'Refresh model list'}
          </Button>
        </div>
        <Input
          label="Model search (optional)"
          value={modelQuery}
          placeholder="flux, tts, video..."
          onChange={(event) => setModelQuery(event.target.value)}
          helper="Refresh model list ile fal.ai katalogunda arama yapar."
        />
        <p className="text-[12px] text-white/70">
          {allModels.length > 0 ? `${allModels.length} model yuklendi (active + deprecated).` : 'Model listesi henuz yuklenmedi.'}
        </p>
        {modelsError && <p className="text-[12px] text-rose-300">{modelsError}</p>}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[14px] font-semibold text-white">Image generation</p>
          <Select
            label="Image model (catalog)"
            value={imageModel}
            onChange={(event) => setImageModel(event.target.value)}
            options={imageModelOptions}
          />
          <Input
            label="Image model id"
            value={imageModel}
            onChange={(event) => setImageModel(event.target.value)}
            helper="Istersen katalog disi model ID de yazabilirsin."
          />
          <label className="block">
            <span className="ui-label">Prompt</span>
            <textarea
              className="ui-textarea mt-2 min-h-[100px]"
              value={imagePrompt}
              onChange={(event) => setImagePrompt(event.target.value)}
            />
          </label>
          <Button variant="secondary" onClick={handleGenerateImage} disabled={imageLoading}>
            {imageLoading ? 'Generating image...' : 'Generate image'}
          </Button>
          {imageUrl && (
            <a href={imageUrl} target="_blank" rel="noreferrer" className="block">
              <img src={imageUrl} alt="fal.ai generated" className="rounded-[14px] border border-white/12" />
            </a>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-[14px] font-semibold text-white">Voice generation</p>
          <Select
            label="Speech model (catalog)"
            value={speechModel}
            onChange={(event) => setSpeechModel(event.target.value)}
            options={speechModelOptions}
          />
          <Input
            label="Speech model id"
            value={speechModel}
            onChange={(event) => setSpeechModel(event.target.value)}
            helper="Istersen katalog disi model ID de yazabilirsin."
          />
          <Input
            label="Voice (optional)"
            value={voice}
            placeholder="alloy / aria / custom"
            onChange={(event) => setVoice(event.target.value)}
          />
          <label className="block">
            <span className="ui-label">Text</span>
            <textarea
              className="ui-textarea mt-2 min-h-[100px]"
              value={speechText}
              onChange={(event) => setSpeechText(event.target.value)}
            />
          </label>
          <Button variant="secondary" onClick={handleGenerateSpeech} disabled={speechLoading}>
            {speechLoading ? 'Generating speech...' : 'Generate speech'}
          </Button>
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full" />
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-[12px] text-rose-300">{error}</p>
      )}
    </Card>
  );
}
