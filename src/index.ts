import { useState, useReducer } from 'react';
import createUseStorageState from './state';
import createUseStorageReducer from './reducer';

const createUseReducer = (
  storage: Storage | null
): ReturnType<typeof createUseStorageReducer> => {
  if (storage) {
    return createUseStorageReducer(storage);
  }

  return (key, reducer, initializerArg, initializer) => {
    const [state, dispatch] = initializer
      ? useReducer(reducer, initializerArg, initializer)
      : useReducer(reducer, initializerArg);
    return [state, dispatch, undefined];
  };
};

const createUseState = (
  storage: Storage | null
): ReturnType<typeof createUseStorageState> => {
  if (storage) {
    return createUseStorageState(storage);
  }

  return (key, defaultState) => {
    const [state, setState] = useState(defaultState);
    return [state, setState, undefined];
  };
};

const getLocalStorage = () =>
  typeof localStorage === 'undefined' ? null : localStorage;
const getSessionStorage = () =>
  typeof sessionStorage === 'undefined' ? null : sessionStorage;

export const useLocalStorageState = createUseState(getLocalStorage());
export const useSessionStorageState = createUseState(getSessionStorage());
export const useLocalStorageReducer = createUseReducer(getLocalStorage());
export const useSessionStorageReducer = createUseReducer(getSessionStorage());
