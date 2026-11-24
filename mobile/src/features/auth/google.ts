import { env } from '@/config/env';

export class GoogleSignInCancelled extends Error {}

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let loaded: Promise<GoogleModule> | null = null;

function loadGoogle() {
  loaded ??= import('@react-native-google-signin/google-signin').then((google) => {
    google.GoogleSignin.configure({ webClientId: env.googleWebClientId, scopes: ['profile', 'email'] });
    return google;
  });
  return loaded;
}

export async function getGoogleIdToken() {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = await loadGoogle();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signOut().catch(() => undefined);
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response) || !response.data.idToken) throw new GoogleSignInCancelled();
    return response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) {
      throw new GoogleSignInCancelled();
    }
    throw error;
  }
}
