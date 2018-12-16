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

const useStorageWriter = <S>(key: string, state: S) => {
  const [writeError, setWriteError] = useState<Error | undefined>(undefined);

  useEffect(
    () => {
      writeItem(key, state).catch(setWriteError);
    },
    [state]
  );
  useEffect(
    () => {
      setWriteError(undefined);
    },
    [key]
  );

  return writeError;
};

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
): [S, React.Dispatch<A>, Error | undefined] => {
  const storageReducer = (
    prevState: S,
    action: A | InternalSetStateAction<S>
  ) => {
    if (
      !initialAction &&
      isObject(action) &&
      action.type === INTERNAL_SET_STATE_ACTION_TYPE
    ) {
      return action.payload;
    }

    return reducer(prevState, action as A);
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
  const writeError = useStorageWriter(key, state);
  useStorageListener(key, (newValue: S) => {
    dispatch({ type: INTERNAL_SET_STATE_ACTION_TYPE, payload: newValue });
  });

  useEffect(
    () => {
      dispatch({ type: INTERNAL_SET_STATE_ACTION_TYPE, payload: initialState });
    },
    [key]
  );

  return [state, dispatch, writeError];
};

// tslint:disable-next-line:ban-types
const isFunction = (fn: any): fn is Function => typeof fn === 'function';

const getInitialState = <S>(key: string, defaultState: S | (() => S)) => {
  const savedState = readItem(key);
  if (savedState !== null) {
    return savedState;
  }
  return isFunction(defaultState) ? defaultState() : defaultState;
};

export const useStorageState = <S>(
  key: string,
  defaultState: S | (() => S)
): [S, React.Dispatch<React.SetStateAction<S>>, Error | undefined] => {
  const [state, setState] = useState<S>(() =>
    getInitialState(key, defaultState)
  );
  const writeError = useStorageWriter(key, state);
  useStorageListener(key, setState);

  useEffect(
    () => {
      setState(getInitialState(key, defaultState));
    },
    [key]
  );

  return [state, setState, writeError];
};
