import { useEffect, useState } from 'react';
import {
  useStorageReader,
  useStorageWriter,
  useStorageListener,
} from './storage';

const createUseStorageState = (storage: Storage) => <S>(
  key: string,
  defaultState: S | (() => S)
): [S, React.Dispatch<React.SetStateAction<S>>, Error | undefined] => {
  const savedState = useStorageReader(storage, key, defaultState);

  const [state, setState] = useState(savedState);
  const writeError = useStorageWriter(storage, key, state);
  useStorageListener<S>(key, setState);

  useEffect(() => {
    setState(savedState);
  }, [key, savedState]);

  return [state, setState, writeError];
};

export default createUseStorageState;
