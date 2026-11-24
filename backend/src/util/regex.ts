export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const exactInsensitive = (value: string) => new RegExp(`^${escapeRegex(value)}$`, 'i');
