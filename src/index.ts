import { useEffect, useMemo, useReducer, useState } from 'react';

const toStorage = (value: any) => JSON.stringify(value);

const fromStorage = (value: string | null) =>
  value !== null ? JSON.parse(value) : null;

const readItem = (storage: Storage, key: string) => {
  try {
    const storedValue = storage.getItem(key);
    return fromStorage(storedValue);
  } catch (e) {
    return null;
  }
};

const writeItem = <S>(storage: Storage, key: string, value: S) =>
  new Promise((resolve, reject) => {
    try {
      storage.setItem(key, toStorage(value));
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

const useStorageWriter = <S>(storage: Storage, key: string, state: S) => {
  const [writeError, setWriteError] = useState<Error | undefined>(undefined);

  useEffect(
    () => {
      writeItem(storage, key, state).catch(setWriteError);
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
type InternalSetStateAction<S> = {
  type: typeof INTERNAL_SET_STATE_ACTION_TYPE;
  payload: S;
};
const createUseStorageReducer = (storage: Storage) => <S, A>(
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
      const savedState = readItem(storage, key);
      return savedState !== null ? savedState : defaultState;
    },
    [key]
  );
  const [state, dispatch] = useReducer<S, A | InternalSetStateAction<S>>(
    storageReducer,
    initialState,
    initialAction
  );
  const writeError = useStorageWriter(storage, key, state);
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

const createUseStorageState = (storage: Storage) => <S>(
  key: string,
  defaultState: S | (() => S)
): [S, React.Dispatch<React.SetStateAction<S>>, Error | undefined] => {
  const getInitialState = () => {
    const savedState = readItem(storage, key);
    if (savedState !== null) {
      return savedState;
    }
    return isFunction(defaultState) ? defaultState() : defaultState;
  };

  const [state, setState] = useState<S>(getInitialState);
  const writeError = useStorageWriter(storage, key, state);
  useStorageListener(key, setState);

  useEffect(
    () => {
      setState(getInitialState());
    },
    [key]
  );

  return [state, setState, writeError];
};

export const useLocalStorageState = createUseStorageState(localStorage);
export const useLocalStorageReducer = createUseStorageReducer(localStorage);

export const useSessionStorageState = createUseStorageState(sessionStorage);
export const useSessionStorageReducer = createUseStorageReducer(sessionStorage);
