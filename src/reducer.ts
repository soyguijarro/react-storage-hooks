import { useReducer, Reducer, Dispatch, useEffect, useState } from 'react';

import {
  useInitialState,
  useStorageListener,
  useStorageWriter,
  StorageObj,
} from './common';

const FORCE_STATE_ACTION = '__FORCE_STATE_INTERNAL_API__';
type ForceStateAction<S> = { type: typeof FORCE_STATE_ACTION; payload: S };

export type State<S> = S | null | undefined

export type UseStorageReducerResult<S, A> = {
  state: State<S>,
  dispatch: Dispatch<A | ForceStateAction<S>>
  isLoading: boolean,
  isWriting: boolean,
  isError: boolean,
  error: Error | undefined
}


function isForceStateAction<S, A>(
  action: A | ForceStateAction<S>
): action is ForceStateAction<S> {
  return (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    action.type === FORCE_STATE_ACTION
  );
}

function addForceStateActionToReducer<S, A>(reducer: Reducer<S, A>) {
  return (state: S, action: A | ForceStateAction<S>) => {
    if (isForceStateAction(action)) return action.payload;
    return reducer(state, action);
  };
}

function useStorageReducer<S, A>(
  storage: StorageObj,
  key: string,
  reducer: Reducer<S, A>,
  defaultState: S
): UseStorageReducerResult<S, A>

function useStorageReducer<S, A, I>(
  storage: StorageObj,
  key: string,
  reducer: Reducer<S, A>,
  defaultInitialArg: I,
  defaultInit: (defaultInitialArg: I) => S
): UseStorageReducerResult<S, A>

function useStorageReducer<S, A, I = S>(
  storage: StorageObj,
  key: string,
  reducer: Reducer<S | null, A>,
  defaultInitialArg: I,
  defaultInit: (defaultInitialArg: I | S) => S = (x) => x as S
): UseStorageReducerResult<S, A> {
  const defaultState = defaultInit(defaultInitialArg);

  const [state, dispatch] = useReducer(addForceStateActionToReducer(reducer), null);
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | undefined>(undefined)
  const initialState = useInitialState(storage, key, defaultState)

  useEffect(() => {
    initialState
      .then((state) => {
        dispatch({ type: FORCE_STATE_ACTION, payload: state })
        setIsLoading(false)
      })
  })

  useStorageListener(
    storage,
    key,
    defaultState,
    (newValue: S) => {
      dispatch({ type: FORCE_STATE_ACTION, payload: newValue });
    },
    setIsLoading
  );

  const { isWriting } = useStorageWriter(storage, key, state, setError);

  return {
    state,
    dispatch,
    isLoading,
    isWriting,
    isError: error !== undefined,
    error
  };
}

export default useStorageReducer;
