/* eslint-disable react-hooks/rules-of-hooks */

import { Dispatch } from 'react';
import { expectType, expectError } from 'tsd';

import { useStorageReducer } from '..';
import { storageLikeObject } from './utils';

type State = { value: number };
type Action = { type: 'inc' | 'dec' };

function reducer(state: State, action: Action) {
  switch (action.type) {
    case 'inc':
      return { value: state.value + 1 };
    case 'dec':
      return { value: state.value - 1 };
    default:
      return state;
  }
}

const [state, dispatch, writeError] = useStorageReducer(
  localStorage,
  'key',
  reducer,
  { value: 0 }
);
expectType<State>(state);
expectType<Dispatch<Action>>(dispatch);
expectType<Error | undefined>(writeError);
expectError(() => dispatch({ type: 'other' }));

const [otherState, otherDispatch] = useStorageReducer(
  localStorage,
  'key',
  reducer,
  0,
  value => ({ value })
);
expectType<State>(otherState);
expectType<Dispatch<Action>>(otherDispatch);

useStorageReducer(storageLikeObject, 'key', reducer, { value: 0 });

expectError(() => useStorageReducer());
expectError(() => useStorageReducer(localStorage));
expectError(() => useStorageReducer(localStorage, 'key'));
expectError(() => useStorageReducer(localStorage, 'key', reducer));

expectError(() => useStorageReducer({}, 'key', reducer, { value: 0 }));
expectError(() => useStorageReducer(localStorage, 0, reducer, { value: 0 }));
expectError(() =>
  useStorageReducer(localStorage, 'key', () => 0, { value: 0 })
);
expectError(() =>
  useStorageReducer(localStorage, 'key', reducer, { value: 'value' })
);
expectError(() =>
  useStorageReducer(localStorage, 'key', reducer, 'value', value => ({ value }))
);
