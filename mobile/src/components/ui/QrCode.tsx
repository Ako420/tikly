import { create } from 'qrcode';
import { useMemo } from 'react';
import { View } from 'react-native';
import { palette } from '@/theme';

type QrCodeProps = {
  value: string;
  size: number;
  accessibilityLabel: string;
};

type Run = { start: number; length: number };

function darkRuns(row: Uint8Array): Run[] {
  const runs: Run[] = [];
  let start = -1;
  row.forEach((cell, index) => {
    if (cell && start < 0) start = index;
    if (!cell && start >= 0) {
      runs.push({ start, length: index - start });
      start = -1;
    }
  });
  if (start >= 0) runs.push({ start, length: row.length - start });
  return runs;
}

export function QrCode({ value, size, accessibilityLabel }: QrCodeProps) {
  const rows = useMemo(() => {
    if (!value) return [];
    const { modules } = create(value, { errorCorrectionLevel: 'M' });
    return Array.from({ length: modules.size }, (_, index) =>
      darkRuns(modules.data.subarray(index * modules.size, (index + 1) * modules.size)),
    );
  }, [value]);

  const cell = rows.length > 0 ? size / rows.length : 0;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ width: size, height: size, backgroundColor: palette.white }}>
      {rows.map((runs, rowIndex) =>
        runs.map((run) => (
          <View
            key={`${rowIndex}-${run.start}`}
            style={{
              position: 'absolute',
              top: rowIndex * cell,
              left: run.start * cell,
              width: run.length * cell + 0.5,
              height: cell + 0.5,
              backgroundColor: palette.ink900,
            }}
          />
        )),
      )}
    </View>
  );
}
