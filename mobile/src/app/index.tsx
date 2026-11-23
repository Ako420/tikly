import { Text, View } from 'react-native';

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white p-6 dark:bg-black">
      <Text className="text-4xl font-semibold text-black dark:text-white">Tikly</Text>
      <Text className="text-base text-zinc-600 dark:text-zinc-400">Discover events, buy tickets, get in.</Text>
    </View>
  );
}
