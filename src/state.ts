import { useState, Dispatch, SetStateAction, useEffect } from 'react';

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
  const [state, setState] = useState<typeof defaultState>(null)
  const initialState = useInitialState(storage, key, defaultState)

  useEffect(() => {
    initialState.then(setState)
  })

  useStorageListener(storage, key, defaultState, setState);
  const writeError = useStorageWriter(storage, key, state);

  return [state, setState, writeError];
}

export default useStorageState;
