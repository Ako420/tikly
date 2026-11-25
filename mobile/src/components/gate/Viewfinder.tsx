import { useEffect, useState } from 'react';
import { Animated, Easing, View, type ViewStyle } from 'react-native';
import { palette } from '@/theme';

type ViewfinderProps = { size: number; scanning: boolean };

const ARM = 56;
const STROKE = 5;
const RADIUS = 18;
const LINE_INSET = 24;

const corners: ViewStyle[] = [
  { top: 0, left: 0, borderTopWidth: STROKE, borderLeftWidth: STROKE, borderTopLeftRadius: RADIUS },
  { top: 0, right: 0, borderTopWidth: STROKE, borderRightWidth: STROKE, borderTopRightRadius: RADIUS },
  { bottom: 0, left: 0, borderBottomWidth: STROKE, borderLeftWidth: STROKE, borderBottomLeftRadius: RADIUS },
  { bottom: 0, right: 0, borderBottomWidth: STROKE, borderRightWidth: STROKE, borderBottomRightRadius: RADIUS },
];

export function Viewfinder({ size, scanning }: ViewfinderProps) {
  const [sweep] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!scanning) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, sweep]);

  const travel = size / 2 - LINE_INSET * 2;
  const translateY = sweep.interpolate({ inputRange: [0, 1], outputRange: [-travel, travel] });

  return (
    <View importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }} className="items-center justify-center">
      {corners.map((corner, index) => (
        <View
          key={index}
          className="absolute"
          style={[{ width: ARM, height: ARM, borderColor: palette.amber400 }, corner]}
        />
      ))}
      {scanning ? (
        <Animated.View
          className="h-[3px] rounded-full"
          style={{
            width: size - LINE_INSET * 3,
            backgroundColor: palette.amber400,
            boxShadow: `0px 0px 14px 4px ${palette.amber400}99`,
            transform: [{ translateY }],
          }}
        />
      ) : null}
    </View>
  );
}
