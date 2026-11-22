import { useMemo, useState } from 'react';
import {
  Activity,
  Bug,
  Check,
  Copy,
  Play,
  Send,
  Trash2,
  Volume2,
} from 'lucide-react';
import type {
  InferenceDevice,
  SpeechAudioState,
  SpeechEngineId,
  SpeechEngineStatus,
  VoiceTelemetry,
} from '../../../../services/speech/types';
import {
  runQuickMicProbe,
  type MicProbeResult,
} from '../../../../services/speech/audioCapture';
import type { VoiceAlignmentResult } from '../../../../utils/phoneticAligner';
import {
  buildDebugReportJson,
  collectVoiceEnvironmentDiagnostics,
  type VoiceDebugEntry,
} from '../../../../utils/voiceDebugLogger';
import { cn } from '../../../../lib/utils';

interface VoiceDebugPanelProps {
  poemTitle: string;
  poemLines: string[];
  currentLineIndex: number;
  glossary: string[];
  engineId: SpeechEngineId;
  status: SpeechEngineStatus;
  inferenceDevice: InferenceDevice | null;
  errorMessage: string | null;
  audioState: SpeechAudioState;
  telemetry: VoiceTelemetry | null;
  vadThreshold: number;
  lastAlignment: VoiceAlignmentResult | null;
  logs: VoiceDebugEntry[];
  onVadThresholdChange: (value: number) => void;
  onFlushAudioNow: () => void;
  onSimulateTranscript: (text: string) => void;
  onClearLogs: () => void;
  onAddLog: (level: 'info' | 'warn' | 'error', message: string) => void;
}

export function VoiceDebugPanel({
  poemTitle,
  poemLines,
  currentLineIndex,
  glossary,
  engineId,
  status,
  inferenceDevice,
  errorMessage,
  audioState,
  telemetry,
  vadThreshold,
  lastAlignment,
  logs,
  onVadThresholdChange,
  onFlushAudioNow,
  onSimulateTranscript,
  onClearLogs,
  onAddLog,
}: VoiceDebugPanelProps) {
  const [simulatedInput, setSimulatedInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isProbingMic, setIsProbingMic] = useState(false);
  const [probeResult, setProbeResult] = useState<MicProbeResult | null>(null);

  const diagnostics = useMemo(() => collectVoiceEnvironmentDiagnostics(), []);
  const targetLine = poemLines[currentLineIndex] ?? '';
  const nextLine = poemLines[currentLineIndex + 1] ?? '';

  const handleCopyReport = async () => {
    const json = buildDebugReportJson({
      poemTitle,
      currentLineIndex,
      targetLine,
      engineId,
      status,
      inferenceDevice,
      errorMessage,
      audioState,
      telemetry,
      diagnostics,
      logs,
    });

    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onAddLog('warn', 'Impossible de copier dans le presse-papiers.');
    }
  };

  const handleMicProbe = async () => {
    setIsProbingMic(true);
    onAddLog('info', 'Test matériel microphone (1,5 s) — parlez maintenant…');
    const result = await runQuickMicProbe(1500);
    setProbeResult(result);
    setIsProbingMic(false);

    if (!result.success) {
      onAddLog('error', `Test micro échoué : ${result.error ?? 'erreur inconnue'}`);
    } else if (result.maxRms < 0.001) {
      onAddLog(
        'warn',
        `Micro ouvert (${result.deviceLabel}, ${result.sampleRate} Hz) mais signal quasi nul (RMS max=${result.maxRms.toFixed(5)}). Vérifiez le volume/source micro système.`
      );
    } else {
      onAddLog(
        'info',
        `Micro OK (${result.deviceLabel}, ${result.sampleRate} Hz) — RMS max=${result.maxRms.toFixed(4)}, peak=${result.maxPeak.toFixed(3)}`
      );
    }
  };

  const handleSubmitSimulation = () => {
    const trimmed = simulatedInput.trim();
    if (!trimmed) return;
    onSimulateTranscript(trimmed);
    setSimulatedInput('');
  };

  const rmsRatio = telemetry ? Math.min(100, (telemetry.rms / 0.08) * 100) : 0;
  const thresholdRatio = Math.min(100, (vadThreshold / 0.08) * 100);

  return (
    <section
      aria-label="Console de diagnostic vocal"
      className="mt-4 rounded-lg border border-slate-300 bg-slate-950 text-slate-100 p-4 space-y-4 text-xs font-mono"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 font-sans font-semibold text-sm text-amber-300">
          <Bug className="w-4 h-4" aria-hidden="true" />
          Mode Debug Vocal
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleMicProbe()}
            disabled={isProbingMic}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 disabled:opacity-50 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            {isProbingMic ? 'Écoute test (1,5 s)…' : 'Tester le micro'}
          </button>
          <button
            type="button"
            onClick={() => void handleCopyReport()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {copied ? 'Copié !' : 'Copier JSON'}
          </button>
          <button
            type="button"
            onClick={onClearLogs}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Effacer les logs"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 1. Environnement & capacités navigateur */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <DiagnosticBadge label="HTTPS / Secure" ok={diagnostics.isSecureContext} />
        <DiagnosticBadge
          label="Web Speech API"
          ok={diagnostics.hasSpeechRecognition || diagnostics.hasWebkitSpeechRecognition}
        />
        <DiagnosticBadge label="getUserMedia" ok={diagnostics.hasGetUserMedia} />
        <DiagnosticBadge label="AudioWorklet" ok={diagnostics.hasAudioWorklet} />
        <DiagnosticBadge label="Web Worker" ok={diagnostics.hasWorker} />
        <DiagnosticBadge label="WebGPU" ok={diagnostics.hasWebGPU} />
        <DiagnosticBadge
          label={`Statut: ${status}`}
          ok={status === 'listening'}
          neutral={status === 'idle'}
        />
        <DiagnosticBadge
          label={`Backend: ${inferenceDevice?.toUpperCase() ?? (engineId === 'web-speech' ? 'BROWSER' : 'AUTO')}`}
          ok={true}
          neutral={!inferenceDevice}
        />
      </div>

      {probeResult && (
        <div
          className={cn(
            'rounded p-2.5 border',
            !probeResult.success
              ? 'bg-red-950/60 border-red-700 text-red-200'
              : probeResult.maxRms < 0.001
                ? 'bg-amber-950/60 border-amber-700 text-amber-200'
                : 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
          )}
        >
          {!probeResult.success ? (
            <span>Test micro échoué : {probeResult.error}</span>
          ) : (
            <span>
              Test micro : <strong>{probeResult.deviceLabel}</strong> ({probeResult.sampleRate} Hz) ·
              RMS max = <strong>{probeResult.maxRms.toFixed(4)}</strong> · Peak ={' '}
              <strong>{probeResult.maxPeak.toFixed(3)}</strong>
              {probeResult.maxRms < 0.001
                ? ' — Signal très faible ou micro coupé !'
                : ' — Signal audio bien reçu.'}
            </span>
          )}
        </div>
      )}

      {/* 2. VU-mètre temps réel & réglage seuil VAD */}
      <div className="rounded bg-slate-900 border border-slate-800 p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
            Niveau micro / VAD
            {telemetry
              ? ` · RMS=${telemetry.rms.toFixed(4)} · ${telemetry.sampleRate} Hz (${telemetry.contextState}) · segments=${telemetry.segmentsEmitted}`
              : ' · (actif en mode Whisper Local)'}
          </span>
          {engineId === 'whisper-webgpu' && status === 'listening' && (
            <button
              type="button"
              onClick={onFlushAudioNow}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Play className="w-3 h-3" aria-hidden="true" />
              Transcrire maintenant
            </button>
          )}
        </div>

        <div className="relative h-3 w-full rounded bg-slate-800 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-75',
              telemetry?.isVoice ? 'bg-emerald-400' : 'bg-indigo-500'
            )}
            style={{ width: `${rmsRatio}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
            style={{ left: `${thresholdRatio}%` }}
            title={`Seuil VAD : ${vadThreshold.toFixed(4)}`}
          />
        </div>

        <label className="flex items-center justify-between gap-3 text-slate-400">
          <span>Seuil détection voix (VAD) : {vadThreshold.toFixed(4)}</span>
          <input
            type="range"
            min="0.001"
            max="0.05"
            step="0.001"
            value={vadThreshold}
            onChange={(e) => onVadThresholdChange(Number(e.target.value))}
            aria-label="Seuil de détection vocale VAD"
            className="w-40 accent-amber-400"
          />
        </label>
      </div>

      {/* 3. Simulateur de dictée (test du pipeline sans micro) */}
      <div className="rounded bg-slate-900 border border-slate-800 p-3 space-y-2">
        <div className="text-slate-300 font-sans font-medium">
          Simulateur de dictée (teste nettoyage + phonétique + validation sans micro)
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={simulatedInput}
            onChange={(e) => setSimulatedInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmitSimulation();
              }
            }}
            placeholder="Ex: Euh oh non je recommence Maître Corbeau sur un arbre perché"
            aria-label="Texte de dictée simulé"
            className="flex-1 rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={handleSubmitSimulation}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            Injecter
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {targetLine && (
            <>
              <button
                type="button"
                onClick={() => onSimulateTranscript(targetLine)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 transition-colors"
              >
                Simuler vers exact
              </button>
              <button
                type="button"
                onClick={() =>
                  onSimulateTranscript(
                    `euh mauvais début oh non je recommence je me suis trompé ${targetLine}`
                  )
                }
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
              >
                Simuler hésitation + reprise
              </button>
            </>
          )}
          {targetLine && nextLine && (
            <button
              type="button"
              onClick={() => onSimulateTranscript(`${targetLine} ${nextLine}`)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 transition-colors"
            >
              Simuler 2 vers en continu
            </button>
          )}
        </div>
      </div>

      {/* 4. Inspection pipeline & glossaire */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded bg-slate-900 border border-slate-800 p-2.5 space-y-1">
          <div className="text-slate-400">Vers cible (#{currentLineIndex + 1})</div>
          <div className="text-slate-100 break-words">{targetLine || '(terminé)'}</div>
          {lastAlignment && (
            <div className="pt-1 border-t border-slate-800 text-slate-300 space-y-0.5">
              <div>Nettoyé : &quot;{lastAlignment.bestCleanedText}&quot;</div>
              <div>
                Validés={lastAlignment.matchedVersesCount} · Reprise=
                {String(lastAlignment.restartDetected)} · Fillers=[
                {lastAlignment.removedFillers.join(', ')}]
              </div>
              <div>
                Mots : [{lastAlignment.currentLineWordStatuses.join(', ')}]
              </div>
            </div>
          )}
        </div>

        <div className="rounded bg-slate-900 border border-slate-800 p-2.5 space-y-1">
          <div className="text-slate-400">Glossaire La Fontaine actif ({glossary.length})</div>
          <div className="text-indigo-300 break-words">{glossary.join(', ')}</div>
        </div>
      </div>

      {/* 5. Journal horodaté */}
      <div className="rounded bg-black/50 border border-slate-800 p-2.5 max-h-48 overflow-y-auto space-y-1">
        {logs.length === 0 ? (
          <div className="text-slate-500 italic">
            Aucun événement enregistré — cliquez sur « Commencer la dictée » ou « Tester le micro ».
          </div>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="leading-snug break-words">
              <span className="text-slate-500">[{entry.timestamp}]</span>{' '}
              <span
                className={cn(
                  'uppercase font-semibold',
                  entry.level === 'error'
                    ? 'text-red-400'
                    : entry.level === 'warn'
                      ? 'text-amber-300'
                      : 'text-sky-400'
                )}
              >
                [{entry.source}]
              </span>{' '}
              <span className="text-slate-200">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DiagnosticBadge({
  label,
  ok,
  neutral = false,
}: {
  label: string;
  ok: boolean;
  neutral?: boolean;
}) {
  return (
    <div
      className={cn(
        'px-2 py-1 rounded border text-center truncate',
        neutral
          ? 'bg-slate-900 border-slate-700 text-slate-300'
          : ok
            ? 'bg-emerald-950/60 border-emerald-700/70 text-emerald-300'
            : 'bg-red-950/60 border-red-700/70 text-red-300'
      )}
    >
      {neutral ? '•' : ok ? '✓' : '✗'} {label}
    </div>
  );
}
