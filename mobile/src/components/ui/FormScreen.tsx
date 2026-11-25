import { useCallback, useEffect, useMemo, useRef, type ComponentRef, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, TextInput } from 'react-native';
import { cn } from '@/lib/cn';
import { FormScrollContext } from './FormScrollContext';
import { NavBar } from './NavBar';
import { Screen } from './Screen';

const FOCUS_OFFSET = 120;
const REVEAL_DELAY_MS = 80;

type FormScreenProps = {
  children: ReactNode;
  contentClassName?: string;
  onBack?: () => void;
  header?: ReactNode;
};

export function FormScreen({ children, contentClassName, onBack, header }: FormScreenProps) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const revealFocused = useCallback(() => {
    setTimeout(() => {
      const input = TextInput.State.currentlyFocusedInput();
      const scroll = scrollRef.current;
      const content = scroll?.getInnerViewRef();
      if (!input || !scroll || !content) return;
      input.measureLayout(
        content,
        (_x, y) => scroll.scrollTo({ y: Math.max(y - FOCUS_OFFSET, 0), animated: true }),
        () => undefined,
      );
    }, REVEAL_DELAY_MS);
  }, []);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', revealFocused);
    return () => subscription.remove();
  }, [revealFocused]);

  const value = useMemo(() => ({ revealFocused }), [revealFocused]);

  return (
    <FormScrollContext.Provider value={value}>
      <Screen>
        {header ?? <NavBar onBack={onBack} />}
        <KeyboardAvoidingView className="flex-1" behavior="padding">
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerClassName={cn('grow px-6 pb-6', contentClassName)}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </FormScrollContext.Provider>
  );
}
