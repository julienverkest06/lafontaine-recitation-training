import { describe, expect, it } from 'vitest';
import {
  appendDebugEntry,
  buildDebugReportJson,
  collectVoiceEnvironmentDiagnostics,
  createDebugEntry,
  isDebugEnabledInUrl,
} from '../voiceDebugLogger';

describe('voiceDebugLogger', () => {
  it('limite le journal circulaire au nombre maximal d’entrées', () => {
    let logs = [] as ReturnType<typeof createDebugEntry>[];
    for (let i = 0; i < 12; i++) {
      logs = appendDebugEntry(logs, createDebugEntry('info', 'engine', `msg-${i}`), 5);
    }

    expect(logs).toHaveLength(5);
    expect(logs[0].message).toBe('msg-7');
    expect(logs[4].message).toBe('msg-11');
  });

  it('détecte les paramètres URL debug=voice / debug=1 dans search ou hash', () => {
    expect(isDebugEnabledInUrl('?debug=voice', '')).toBe(true);
    expect(isDebugEnabledInUrl('', '#/reciter/le-corbeau-et-le-renard?debug=1')).toBe(true);
    expect(isDebugEnabledInUrl('', '#/reciter/le-corbeau-et-le-renard')).toBe(false);
  });

  it('génère un rapport JSON valide contenant diagnostic et logs', () => {
    const diagnostics = collectVoiceEnvironmentDiagnostics();
    const json = buildDebugReportJson({
      poemTitle: 'Le Corbeau et le Renard',
      currentLineIndex: 0,
      targetLine: 'Maître Corbeau, sur un arbre perché,',
      engineId: 'whisper-webgpu',
      status: 'listening',
      inferenceDevice: 'wasm',
      errorMessage: null,
      audioState: { micActive: true, soundDetected: false, speechDetected: false },
      telemetry: null,
      diagnostics,
      logs: [createDebugEntry('info', 'whisper', 'Modèle chargé')],
    });

    const parsed = JSON.parse(json);
    expect(parsed.poemTitle).toBe('Le Corbeau et le Renard');
    expect(parsed.engineId).toBe('whisper-webgpu');
    expect(parsed.logs).toHaveLength(1);
    expect(parsed.diagnostics).toHaveProperty('hasWorker');
  });
});
