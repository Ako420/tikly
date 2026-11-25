import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import type { ScanResult } from './types';

export type FeedbackTone = 'valid' | 'warning' | 'error';

const sources: Record<FeedbackTone, number> = {
  valid: require('../../../assets/sounds/scan-valid.wav'),
  warning: require('../../../assets/sounds/scan-warning.wav'),
  error: require('../../../assets/sounds/scan-error.wav'),
};

const haptics: Record<FeedbackTone, Haptics.NotificationFeedbackType> = {
  valid: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

const players: Partial<Record<FeedbackTone, AudioPlayer>> = {};
let audioModeSet = false;

export const toneFor = (result: ScanResult): FeedbackTone =>
  result === 'VALID' ? 'valid' : result === 'ALREADY_CHECKED_IN' ? 'warning' : 'error';

export async function playScanFeedback(tone: FeedbackTone, withSound: boolean) {
  Haptics.notificationAsync(haptics[tone]).catch(() => undefined);
  if (!withSound) return;
  try {
    if (!audioModeSet) {
      await setAudioModeAsync({ playsInSilentMode: true });
      audioModeSet = true;
    }
    const player = players[tone] ?? (players[tone] = createAudioPlayer(sources[tone]));
    await player.seekTo(0);
    player.play();
  } catch {
    return;
  }
}
