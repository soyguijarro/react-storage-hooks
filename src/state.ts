import { useState, Dispatch, SetStateAction } from 'react';

import {
  useInitialState,
  useStorageListener,
  useStorageWriter,
  StorageObj,
} from './common';

function useStorageState<S>(
  storage: StorageObj,
  key: string,
  defaultState: S | (() => S)
): [S, Dispatch<SetStateAction<S>>, Error | undefined];

function useStorageState<S>(
  storage: StorageObj,
  key: string
): [S | null, Dispatch<SetStateAction<S | null>>, Error | undefined];

function useStorageState<S>(
  storage: StorageObj,
  key: string,
  defaultState: S | (() => S) | null = null
) {
  const [state, setState] = useState(
    useInitialState(storage, key, defaultState)
  );

  useStorageListener(storage, key, defaultState, setState);
  const writeError = useStorageWriter(storage, key, state);

  return [state, setState, writeError];
}

export default useStorageState;
