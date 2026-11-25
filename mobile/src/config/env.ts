export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  useSampleData: process.env.EXPO_PUBLIC_USE_SAMPLE_DATA !== 'false',
};
