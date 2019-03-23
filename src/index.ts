import createUseStorageState from './state';
import createUseStorageReducer from './reducer';

export const useLocalStorageState = createUseStorageState(localStorage);
export const useLocalStorageReducer = createUseStorageReducer(localStorage);
export const useSessionStorageState = createUseStorageState(sessionStorage);
export const useSessionStorageReducer = createUseStorageReducer(sessionStorage);
