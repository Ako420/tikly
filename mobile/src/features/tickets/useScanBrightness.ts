import * as Brightness from 'expo-brightness';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

const SCAN_BRIGHTNESS = 1;

export function useScanBrightness() {
  const [raised, setRaised] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let previous: number | undefined;

      Brightness.getBrightnessAsync()
        .then((level) => {
          previous = level;
          return Brightness.setBrightnessAsync(SCAN_BRIGHTNESS);
        })
        .then(() => active && setRaised(true))
        .catch(() => active && setRaised(false));

      return () => {
        active = false;
        setRaised(false);
        const restore =
          Platform.OS === 'android'
            ? Brightness.restoreSystemBrightnessAsync()
            : previous !== undefined
              ? Brightness.setBrightnessAsync(previous)
              : Promise.resolve();
        restore.catch(() => undefined);
      };
    }, []),
  );

  return raised;
}
