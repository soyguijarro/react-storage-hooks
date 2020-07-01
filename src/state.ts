import { useState, Dispatch, SetStateAction, useEffect } from 'react';

import {
  useInitialState,
  useStorageListener,
  StorageObj,
  useStorageWriter,
} from './common';

export type State<S> = S | null | undefined

export type UseStorageStateResult<S> = {
  state: State<S>,
  setState: Dispatch<SetStateAction<State<S>>>
  isLoading: boolean,
  isWriting: boolean,
  isError: boolean,
  error: Error | undefined
}

function useStorageState<S>(
  storage: StorageObj,
  key: string,
  defaultState: S | (() => S)
): UseStorageStateResult<S>

function useStorageState<S>(
  storage: StorageObj,
  key: string
): UseStorageStateResult<S>

function useStorageState<S>(
  storage: StorageObj,
  key: string,
  defaultState: S | (() => S) | null = null
): UseStorageStateResult<S> {
  const [state, setState] = useState<S | null | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | undefined>(undefined)
  const defaultStateResult = defaultState instanceof Function ? defaultState() : defaultState
  const initialState = useInitialState(storage, key, defaultStateResult)

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    initialState
      .then((state) => {
        setState(state)
        setIsLoading(false)
      })
      .catch(setError)
  })
  /* eslint-enable react-hooks/exhaustive-deps */

  useStorageListener(storage, key, defaultStateResult, setState, setIsLoading)
  const { isWriting } = useStorageWriter(storage, key, state, setError)

  return {
    state,
    setState,
    isLoading,
    isWriting,
    isError: error !== undefined,
    error
  };
}

export default useStorageState;
