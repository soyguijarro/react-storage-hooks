import { useState, useEffect, useMemo } from 'react';

const toStorage = <V>(value: V): string => JSON.stringify(value);

const fromStorage = <V>(value: string | null): V | null =>
  value !== null ? JSON.parse(value) : null;

export const useStorageListener = <V>(
  key: string,
  onChange: (newValue: V) => void
): void => {
  const handleStorageChange = (event: StorageEvent): void => {
    if (event.key === key && (event.newValue === event.oldValue) === false) {
      onChange(fromStorage(event.newValue) as V);
    }
  };

  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  });
};

const writeItem = <S>(storage: Storage, key: string, value: S): Promise<void> =>
  new Promise((resolve, reject) => {
    try {
      storage.setItem(key, toStorage(value));
      resolve();
    } catch (error) {
      reject(error);
    }
  });

export const useStorageWriter = <S>(
  storage: Storage,
  key: string,
  state: S
): Error | undefined => {
  const [writeError, setWriteError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    writeItem(storage, key, state).catch(setWriteError);
  }, [state, key, storage]);
  useEffect(() => {
    setWriteError(undefined);
  }, [key]);

  return writeError;
};

const readItem = <S>(storage: Storage, key: string): S | null => {
  try {
    const storedValue = storage.getItem(key);
    return fromStorage(storedValue);
  } catch (e) {
    return null;
  }
};

export const useStorageReader = <S>(
  storage: Storage,
  key: string,
  defaultValue: S
): S =>
  useMemo(() => {
    const storedValue = readItem<S>(storage, key);
    return storedValue !== null ? storedValue : defaultValue;
  }, [key, storage, defaultValue]);
