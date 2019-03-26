import { useEffect, useReducer } from 'react';
import {
  useStorageReader,
  useStorageWriter,
  useStorageListener,
} from './storage';

const INTERNAL_SET_ACTION_TYPE = Symbol('INTERNAL_SET_ACTION_TYPE');
interface InternalSetAction<S> {
  type: typeof INTERNAL_SET_ACTION_TYPE;
  payload: S;
}

const createInternalSetAction = <S>(payload: S): InternalSetAction<S> => ({
  type: INTERNAL_SET_ACTION_TYPE,
  payload,
});

const isInternalSetAction = <S>(action: any): action is InternalSetAction<S> =>
  action && action.type === INTERNAL_SET_ACTION_TYPE;

const createStorageReducer = <R extends React.Reducer<any, any>, I>(
  reducer: R
) => (
  prevState: React.ReducerState<R>,
  action: I | InternalSetAction<React.ReducerState<R>>
): React.ReducerState<R> =>
  isInternalSetAction(action) ? action.payload : reducer(prevState, action);

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
  const storageReducer = createStorageReducer<R, I>(reducer);
  const storageInitializerArg = useStorageReader(storage, key, initializerArg);
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

export default createUseStorageReducer;
