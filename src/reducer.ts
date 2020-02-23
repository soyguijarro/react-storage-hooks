import { useReducer, Reducer, Dispatch } from 'react';

import {
  useInitialState,
  useStorageListener,
  useStorageWriter,
  StorageObj,
} from './common';

const FORCE_STATE_ACTION = '__FORCE_STATE_INTERNAL_API__';
type ForceStateAction<S> = { type: typeof FORCE_STATE_ACTION; payload: S };

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
): [S, Dispatch<A>, Error | undefined];

function useStorageReducer<S, A, I>(
  storage: StorageObj,
  key: string,
  reducer: Reducer<S, A>,
  defaultInitialArg: I,
  defaultInit: (defaultInitialArg: I) => S
): [S, Dispatch<A>, Error | undefined];

function useStorageReducer<S, A, I = S>(
  storage: StorageObj,
  key: string,
  reducer: Reducer<S, A>,
  defaultInitialArg: I,
  defaultInit: (defaultInitialArg: I | S) => S = x => x as S
): [S, Dispatch<A>, Error | undefined] {
  const defaultState = defaultInit(defaultInitialArg);

  const [state, dispatch] = useReducer(
    addForceStateActionToReducer(reducer),
    useInitialState(storage, key, defaultState)
  );

  useStorageListener(storage, key, defaultState, (newValue: S) => {
    dispatch({ type: FORCE_STATE_ACTION, payload: newValue });
  });
  const writeError = useStorageWriter(storage, key, state);

  return [state, dispatch, writeError];
}

export default useStorageReducer;
