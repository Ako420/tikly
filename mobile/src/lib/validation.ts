export const MIN_PASSWORD_LENGTH = 8;

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const toLocalCameroonNumber = (value: string) => value.replace(/\D/g, '').replace(/^237/, '');

export const isCameroonMobile = (value: string) => /^6\d{8}$/.test(toLocalCameroonNumber(value));

export const toInternationalCameroonNumber = (value: string) => `+237${toLocalCameroonNumber(value)}`;
