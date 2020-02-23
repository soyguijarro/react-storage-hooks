import React from 'react';

import { useStorageState, useStorageReducer } from 'react-storage-hooks';

export function StateCounter() {
  const [count, setCount, writeError] = useStorageState(
    localStorage,
    'state-counter',
    0
  );

  return (
    <>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
      {writeError && (
        <pre>Cannot write to localStorage: {writeError.message}</pre>
      )}
    </>
  );
}

function reducer(state: { count: number }, action: { type: 'inc' | 'dec' }) {
  switch (action.type) {
    case 'inc':
      return { count: state.count + 1 };
    case 'dec':
      return { count: state.count - 1 };
    default:
      return state;
  }
}

export function ReducerCounter() {
  const [state, dispatch, writeError] = useStorageReducer(
    localStorage,
    'reducer-counter',
    reducer,
    { count: 0 }
  );

  return (
    <>
      <p>You clicked {state.count} times</p>
      <button onClick={() => dispatch({ type: 'inc' })}>+</button>
      <button onClick={() => dispatch({ type: 'dec' })}>-</button>
      {writeError && (
        <pre>Cannot write to localStorage: {writeError.message}</pre>
      )}
    </>
  );
}

export default { title: 'Examples' };
