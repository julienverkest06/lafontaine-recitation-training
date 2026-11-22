import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    e2eEmitSpeech?: (type: string, payload: unknown) => void;
    e2eSpeechStarted?: boolean;
  }
}

test.describe('Récitation vocale & Mode Debug (E2E)', () => {
  test('parcours complet Lecture intégrale -> Récitation vocale -> Debug -> Simulateur hésitations & multi-vers', async ({
    page,
  }) => {
    await page.goto('#/lire/le-corbeau-et-le-renard');

    // Vérifie la vue Lecture intégrale
    await expect(
      page.getByRole('heading', { name: 'Le Corbeau et le Renard', level: 2 })
    ).toBeVisible();
    await expect(
      page.getByText('Maître Corbeau, sur un arbre perché,')
    ).toBeVisible();

    // Bascule en entraînement sur cette fable
    await page
      .getByRole('button', { name: /S'entraîner sur cette fable/i })
      .click();

    // Passe en mode vocal
    await page.getByRole('button', { name: /Passer en mode vocal/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Récitation vocale' })
    ).toBeVisible();

    // Ouvre le Mode Debug Vocal
    await page.getByRole('button', { name: /^Debug$/i }).click();
    await expect(page.getByText('Mode Debug Vocal')).toBeVisible();
    await expect(page.getByText(/Glossaire La Fontaine actif/i)).toBeVisible();

    // Simule une hésitation + auto-correction sur le vers 1
    await page
      .getByRole('button', { name: /Simuler hésitation \+ reprise/i })
      .click();

    await expect(
      page.getByText('✓ Maître Corbeau, sur un arbre perché,')
    ).toBeVisible();
    await expect(page.getByText('1/18')).toBeVisible();

    // Simule 2 vers récités en continu sans pause
    await page
      .getByRole('button', { name: /Simuler 2 vers en continu/i })
      .click();

    await expect(page.getByText('3/18')).toBeVisible();
    await expect(
      page.getByText('✓ Tenait en son bec un fromage.')
    ).toBeVisible();
  });

  test('affiche immédiatement la dictée en direct (intérim + pause) via Web Speech dans le navigateur', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      class FakeSpeechRecognition {
        continuous = false;
        interimResults = false;
        maxAlternatives = 1;
        lang = '';
        private listeners = new Map<string, Set<(e: unknown) => void>>();

        constructor() {
          window.e2eEmitSpeech = (type: string, payload: unknown) => {
            for (const fn of this.listeners.get(type) ?? []) {
              fn(payload);
            }
          };
        }

        addEventListener(type: string, fn: (e: unknown) => void) {
          const set = this.listeners.get(type) ?? new Set();
          set.add(fn);
          this.listeners.set(type, set);
        }

        removeEventListener(type: string, fn: (e: unknown) => void) {
          this.listeners.get(type)?.delete(fn);
        }

        start() {
          window.e2eSpeechStarted = true;
          window.e2eEmitSpeech?.('start', {});
          window.e2eEmitSpeech?.('audiostart', {});
        }

        stop() {
          window.e2eEmitSpeech?.('audioend', {});
          window.e2eEmitSpeech?.('end', {});
        }
      }

      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
        FakeSpeechRecognition;
    });

    await page.goto('#/reciter/le-corbeau-et-le-renard');
    await page.getByRole('button', { name: /Passer en mode vocal/i }).click();
    await page.getByRole('button', { name: /Commencer la dictée/i }).click();

    await expect(page.getByText('Micro actif — parlez')).toBeVisible();

    // Émet la première moitié en intérim
    await page.evaluate(() => {
      const r0 = [{ transcript: 'Maître Corbeau', confidence: 0.92 }];
      Object.defineProperty(r0, 'isFinal', { value: false });
      window.e2eEmitSpeech?.('speechstart', {});
      window.e2eEmitSpeech?.('result', { results: [r0] });
    });

    await expect(page.getByText('Parole détectée')).toBeVisible();
    await expect(page.getByText('Maître Corbeau', { exact: true })).toBeVisible();

    // Pause puis seconde moitié -> cumul + validation automatique du vers 1
    await page.evaluate(() => {
      const r0 = [{ transcript: 'Maître Corbeau', confidence: 0.95 }];
      Object.defineProperty(r0, 'isFinal', { value: true });
      const r1 = [{ transcript: 'sur un arbre perché', confidence: 0.96 }];
      Object.defineProperty(r1, 'isFinal', { value: true });
      window.e2eEmitSpeech?.('result', { results: [r0, r1] });
    });

    await expect(
      page.getByText('✓ Maître Corbeau, sur un arbre perché,')
    ).toBeVisible();
    await expect(page.getByText('1/18')).toBeVisible();
  });

  test('conserve le message d’erreur réseau Web Speech et ouvre Debug via ?debug=voice', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      class FailingSpeechRecognition {
        private listeners = new Map<string, Set<(e: unknown) => void>>();

        addEventListener(type: string, fn: (e: unknown) => void) {
          const set = this.listeners.get(type) ?? new Set();
          set.add(fn);
          this.listeners.set(type, set);
        }

        removeEventListener(type: string, fn: (e: unknown) => void) {
          this.listeners.get(type)?.delete(fn);
        }

        start() {
          for (const fn of this.listeners.get('error') ?? []) {
            fn({ error: 'network' });
          }
          for (const fn of this.listeners.get('end') ?? []) {
            fn({});
          }
        }

        stop() {
          // noop
        }
      }

      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
        FailingSpeechRecognition;
    });

    await page.goto('#/reciter/la-cigale-et-la-fourmi?debug=voice');
    await page.getByRole('button', { name: /Passer en mode vocal/i }).click();

    // Le mode Debug doit être ouvert automatiquement grâce au paramètre URL
    await expect(page.getByText('Mode Debug Vocal')).toBeVisible();

    await page.getByRole('button', { name: /Commencer la dictée/i }).click();

    // L'alerte d'erreur réseau doit rester affichée malgré l'événement end immédiat
    await expect(page.getByRole('alert')).toContainText(
      /Whisper Local \(IA\)/i
    );

    // Bascule sur Whisper Local et ajuste le seuil VAD
    await page.getByRole('button', { name: /Whisper Local \(IA\)/i }).click();
    await expect(
      page.getByLabel('Taille du modèle Whisper')
    ).toBeVisible();
    await expect(
      page.getByLabel('Seuil de détection vocale VAD')
    ).toBeVisible();
  });

  test('simulateur libre dans Mode Debug : archaïsme La Fontaine + journal horodaté', async ({
    page,
  }) => {
    await page.goto('#/reciter/la-cigale-et-la-fourmi?debug=voice');
    await page.getByRole('button', { name: /Passer en mode vocal/i }).click();
    await expect(page.getByText('Mode Debug Vocal')).toBeVisible();

    // Saisie manuelle dans le simulateur avec hésitation + forme orale
    const input = page.getByLabel('Texte de dictée simulé');
    await input.fill('euh hum La Cigale ayant chanté');
    await page.getByRole('button', { name: /Injecter/i }).click();

    await expect(page.getByText('✓ La Cigale, ayant chanté')).toBeVisible();
    await expect(page.getByText('1/22')).toBeVisible();

    // Vérifie que le journal horodaté a bien enregistré l'alignement
    await expect(page.getByText(/\[aligner\]/i).first()).toBeVisible();

    // Efface les logs
    await page.getByTitle('Effacer les logs').click();
    await expect(
      page.getByText(/Aucun événement enregistré/i)
    ).toBeVisible();
  });
});
