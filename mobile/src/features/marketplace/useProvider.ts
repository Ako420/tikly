import { marketplaceApi } from './api';
import { useAsync } from '@/lib/useAsync';

export function useMyProvider() {
  return useAsync(() => marketplaceApi.myProvider(), 'my-provider');
}
