import { useState, useReducer, useEffect, useMemo } from 'react';

const toStorage = value => JSON.stringify(value);

const fromStorage = value => JSON.parse(value);

const readItem = key => {
  try {
    const storedValue = localStorage.getItem(key);
    return fromStorage(storedValue);
  } catch (e) {
    return null;
  }
};

const writeItem = (key, value) =>
  new Promise((resolve, reject) => {
    try {
      localStorage.setItem(key, toStorage(value));
      resolve();
    } catch (error) {
      reject(error);
    }
  });

const useStorageListener = (key, onChange) => {
  const handleStorageChange = event => {
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

const SET_STATE_ACTION_TYPE = Symbol('SET_STATE_ACTION_TYPE');
export const useStorageReducer = (
  key,
  reducer,
  defaultState,
  initialAction
) => {
  const [writeError, setWriteError] = useState();

  const storageReducer = (state, action) => {
    if (action.type === SET_STATE_ACTION_TYPE) {
      return action.payload;
    }

    const newState = reducer(state, action);
    writeItem(key, newState).catch(setWriteError);
    return newState;
  };
  const initialState = useMemo(
    () => {
      const savedState = readItem(key);
      return savedState !== null ? savedState : defaultState;
    },
    [key]
  );
  const [state, dispatch] = useReducer(
    storageReducer,
    initialState,
    initialAction
  );

  useStorageListener(key, newValue => {
    dispatch({ type: SET_STATE_ACTION_TYPE, payload: newValue });
  });

  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    dispatch({ type: SET_STATE_ACTION_TYPE, payload: initialState });
    setWriteError(undefined);
    setPrevKey(key);
  }

  return [state, dispatch, writeError];
};

const isFunction = fn => typeof fn === 'function';

const getInitialState = (key, defaultState) => {
  const savedState = readItem(key);
  if (savedState !== null) {
    return savedState;
  }
  return isFunction(defaultState) ? defaultState() : defaultState;
};

export const useStorageState = (key, defaultState) => {
  const [state, setState] = useState(() => getInitialState(key, defaultState));
  const [writeError, setWriteError] = useState();

  useStorageListener(key, setState);

  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setState(getInitialState(key, defaultState));
    setWriteError(undefined);
    setPrevKey(key);
  }

  const saveState = newState => {
    const computedState = isFunction(newState) ? newState(state) : newState;
    setState(computedState);
    writeItem(key, computedState).catch(setWriteError);
  };

  return [state, saveState, writeError];
};
