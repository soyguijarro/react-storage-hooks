import { useEffect, useMemo, useReducer, useState } from 'react';

const toStorage = (value: any) => JSON.stringify(value);

const fromStorage = (value: string | null) =>
  value !== null ? JSON.parse(value) : null;

const readItem = (key: string) => {
  try {
    const storedValue = localStorage.getItem(key);
    return fromStorage(storedValue);
  } catch (e) {
    return null;
  }
};

const writeItem = <S>(key: string, value: S) =>
  new Promise((resolve, reject) => {
    try {
      localStorage.setItem(key, toStorage(value));
      resolve();
    } catch (error) {
      reject(error);
    }
  });

const useStorageListener = <V>(
  key: string,
  onChange: ((newValue: V) => void)
) => {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === key) {
      onChange(fromStorage(event.newValue));
    }
  };

  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
};

type WriteError = Error | undefined;

const isObject = (value: any): value is object =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const INTERNAL_SET_STATE_ACTION_TYPE = Symbol('INTERNAL_SET_STATE_ACTION_TYPE');
interface InternalSetStateAction<S> {
  type: typeof INTERNAL_SET_STATE_ACTION_TYPE;
  payload: S;
}
export const useStorageReducer = <S, A>(
  key: string,
  reducer: React.Reducer<S, A>,
  defaultState: S,
  initialAction?: A | null
): [S, ((action: A) => void), WriteError] => {
  const [writeError, setWriteError] = useState<WriteError>(undefined);

  const storageReducer = (
    prevState: S,
    action: A | InternalSetStateAction<S>
  ) => {
    if (isObject(action) && action.type === INTERNAL_SET_STATE_ACTION_TYPE) {
      return action.payload;
    }

    const newState = reducer(prevState, action as A);
    writeItem(key, newState).catch(setWriteError);
    return newState;
  };
  const initialState = useMemo<S>(
    () => {
      const savedState = readItem(key);
      return savedState !== null ? savedState : defaultState;
    },
    [key]
  );
  const [state, dispatch] = useReducer<S, A | InternalSetStateAction<S>>(
    storageReducer,
    initialState,
    initialAction
  );

  useStorageListener(key, (newValue: S) => {
    dispatch({ type: INTERNAL_SET_STATE_ACTION_TYPE, payload: newValue });
  });

  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    dispatch({ type: INTERNAL_SET_STATE_ACTION_TYPE, payload: initialState });
    setWriteError(undefined);
    setPrevKey(key);
  }

  return [state, dispatch, writeError];
};

type DefaultState<S> = S | (() => S);

// tslint:disable-next-line:ban-types
const isFunction = (fn: any): fn is Function => typeof fn === 'function';

const getInitialState = <S>(key: string, defaultState: DefaultState<S>) => {
  const savedState = readItem(key);
  if (savedState !== null) {
    return savedState;
  }
  return isFunction(defaultState) ? defaultState() : defaultState;
};

export const useStorageState = <S>(
  key: string,
  defaultState: DefaultState<S>
): [S, typeof setState, WriteError] => {
  const [state, setState] = useState<S>(() =>
    getInitialState(key, defaultState)
  );
  const [writeError, setWriteError] = useState<WriteError>(undefined);

  useStorageListener(key, setState);

  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setState(getInitialState(key, defaultState));
    setWriteError(undefined);
    setPrevKey(key);
  }

  const saveState: typeof setState = newState => {
    const computedState = isFunction(newState) ? newState(state) : newState;
    setState(computedState);
    writeItem(key, computedState).catch(setWriteError);
  };

  return [state, saveState, writeError];
};
