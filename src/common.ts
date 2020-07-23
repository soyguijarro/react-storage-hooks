import { useState, useEffect, useRef, useMemo } from 'react';

type MakePromisable<T> = T extends (...args: infer U) => infer R
  ? (...args: U) => Promise<R> | R
  : T;

export type StorageObj = {
  getItem: MakePromisable<Storage['getItem']>
  setItem: MakePromisable<Storage['setItem']>
  removeItem: MakePromisable<Storage['removeItem']>
}

function fromStorage<T>(value: string | null) {
  return value !== null ? (JSON.parse(value) as T) : null;
}

async function readItem<T>(storage: StorageObj, key: string) {
  try {
    const storedValue = await storage.getItem(key);
    return fromStorage<T>(storedValue);
  } catch (e) {
    return null;
  }
}

function toStorage<T>(value: T | null) {
  return JSON.stringify(value);
}

export async function writeItem<T>(storage: StorageObj, key: string, value: T | null) {
  try {
    if (value !== null) {
      await storage.setItem(key, toStorage<T>(value));
    } else {
      await storage.removeItem(key);
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}

export function useInitialState<S>(
  storage: StorageObj,
  key: string,
  defaultState: S
) {
  const defaultStateRef = useRef(defaultState);

  return useMemo(
    async () => await readItem<S>(storage, key) ?? defaultStateRef.current,
    [key, storage]
  );
}

export function useStorageWriter<S>(
  storage: StorageObj,
  key: string,
  state: S,
  onError: (error: Error) => void
) {
  const [isWriting, setIsWriting] = useState(false)
  const onErrorRef = useRef(onError);

  useEffect(() => {
    setIsWriting(true)

    writeItem<S>(storage, key, state)
      .catch((error) => {
        if (!error || !error.message) {
          onErrorRef.current(error);
        }
      })
      .finally(() => {
        setIsWriting(false)
      });
  }, [state, key, storage]);

  return { isWriting };
}

export function useStorageListener<S>(
  storage: StorageObj,
  key: string,
  defaultState: S,
  onChange: (newValue: S) => void,
  onLoading: (isLoading: boolean) => void
) {
  const defaultStateRef = useRef(defaultState);
  const onChangeRef = useRef(onChange);
  const onLoadingRef = useRef(onLoading);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    onLoadingRef.current(true)
    readItem<S>(storage, key)
      .then((value) => {
        onChangeRef.current(value ?? defaultStateRef.current)
      })
      .finally(() => onLoadingRef.current(false))
  }, [key, storage]);

  useEffect(() => {
    function onStorageChange(event: StorageEvent) {
      if (event.key === key) {
        onChangeRef.current(
          fromStorage<S>(event.newValue) ?? defaultStateRef.current
        );
      }
    }

    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener !== 'undefined'
    ) {
      window.addEventListener('storage', onStorageChange);
      return () => {
        window.removeEventListener('storage', onStorageChange);
      };
    }
  }, [key]);
}
