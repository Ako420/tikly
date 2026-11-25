import { Text } from './Text';

type LinkPromptProps = {
  prompt: string;
  action: string;
  onPress: () => void;
};

export function LinkPrompt({ prompt, action, onPress }: LinkPromptProps) {
  return (
    <Text variant="bodySm" tone="secondary" className="text-center">
      {prompt}
      <Text variant="link" tone="accent" accessibilityRole="link" onPress={onPress} suppressHighlighting={false}>
        {action}
      </Text>
    </Text>
  );
}
