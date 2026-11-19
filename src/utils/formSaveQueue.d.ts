export function createSaveQueue(): <T>(task: () => Promise<T>) => Promise<T>;
