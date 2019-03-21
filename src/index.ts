import { useEffect, useMemo, useReducer, useState } from 'react';

const toStorage = (value: any) => JSON.stringify(value);

const fromStorage = (value: string | null) =>
  value !== null ? JSON.parse(value) : null;

const readItem = <S>(storage: Storage, key: string): S | null => {
  try {
    const storedValue = storage.getItem(key);
    return fromStorage(storedValue);
  } catch (e) {
    return null;
  }
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

const useStorageListener = <V>(
  key: string,
  onChange: (newValue: V) => void
): void => {
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

const useStorageWriter = <S>(
  storage: Storage,
  key: string,
  state: S
): Error | undefined => {
  const [writeError, setWriteError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    writeItem(storage, key, state).catch(setWriteError);
  }, [state]);
  useEffect(() => {
    setWriteError(undefined);
  }, [key]);

  return writeError;
};

const INTERNAL_SET_ACTION_TYPE = Symbol('INTERNAL_SET_ACTION_TYPE');
type InternalSetAction<S> = {
  type: typeof INTERNAL_SET_ACTION_TYPE;
  payload: S;
};
const isInternalSetAction = <S>(action: any): action is InternalSetAction<S> =>
  action && action.type === INTERNAL_SET_ACTION_TYPE;
const createInternalSetAction = <S>(payload: S): InternalSetAction<S> => ({
  type: INTERNAL_SET_ACTION_TYPE,
  payload,
});

const createUseStorageReducer = (storage: Storage) => <
  R extends React.Reducer<any, any>,
  I
>(
  key: string,
  reducer: R,
  initializerArg: I & React.ReducerState<R>,
  initializer?: (arg: I & React.ReducerState<R>) => React.ReducerState<R>
): [
  React.ReducerState<R>,
  React.Dispatch<React.ReducerAction<R>>,
  Error | undefined
] => {
  const storageReducer = (
    prevState: React.ReducerState<R>,
    action: I | InternalSetAction<React.ReducerState<R>>
  ): React.ReducerState<R> =>
    isInternalSetAction(action) ? action.payload : reducer(prevState, action);
  const storageInitializerArg = useMemo(() => {
    const savedState = readItem<React.ReducerState<R>>(storage, key);
    return savedState !== null ? savedState : initializerArg;
  }, [key]);
  const [state, dispatch] = initializer
    ? useReducer(storageReducer, storageInitializerArg, initializer)
    : useReducer(storageReducer, storageInitializerArg);

  const writeError = useStorageWriter(storage, key, state);
  useStorageListener<React.ReducerState<R>>(key, newValue => {
    dispatch(createInternalSetAction(newValue));
  });

  useEffect(() => {
    dispatch(
      createInternalSetAction(
        initializer ? initializer(storageInitializerArg) : storageInitializerArg
      )
    );
  }, [key]);

  return [state, dispatch, writeError];
};

// tslint:disable-next-line:ban-types
const isFunction = (fn: any): fn is Function => typeof fn === 'function';

const createUseStorageState = (storage: Storage) => <S>(
  key: string,
  defaultState: S | (() => S)
): [S, React.Dispatch<React.SetStateAction<S>>, Error | undefined] => {
  const getInitialState = (): S => {
    const savedState = readItem<S>(storage, key);
    if (savedState !== null) {
      return savedState;
    }
    return isFunction(defaultState) ? defaultState() : defaultState;
  };

  const [state, setState] = useState(getInitialState);
  const writeError = useStorageWriter(storage, key, state);
  useStorageListener<S>(key, setState);

  useEffect(() => {
    setState(getInitialState());
  }, [key]);

  return [state, setState, writeError];
};

export const useLocalStorageState = createUseStorageState(localStorage);
export const useLocalStorageReducer = createUseStorageReducer(localStorage);

export const useSessionStorageState = createUseStorageState(sessionStorage);
export const useSessionStorageReducer = createUseStorageReducer(sessionStorage);
