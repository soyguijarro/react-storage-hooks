import React, { Fragment } from 'react';
import { useLocalStorageState, useLocalStorageReducer } from './index';

export const INCREMENT_BUTTON_TEXT = '+';
export const RESET_BUTTON_TEXT = 'Reset';

type CountState = { count: number };

type CounterProps = {
  value: number | undefined;
  onIncrement: () => void;
  onReset: () => void;
  writeErrorMessage: string | undefined;
};

const Counter = ({
  value,
  onIncrement,
  onReset,
  writeErrorMessage,
}: CounterProps) => (
  <Fragment>
    {value !== undefined && <p id="value">{value}</p>}
    <button onClick={onIncrement}>{INCREMENT_BUTTON_TEXT}</button>
    <button onClick={onReset}>{RESET_BUTTON_TEXT}</button>
    {writeErrorMessage && <p>{writeErrorMessage}</p>}
  </Fragment>
);

type StateCounterProps = {
  storageKey: string;
  defaultState: CountState | (() => CountState);
};

export const createCounterComponentWithState = (
  useStorageState: typeof useLocalStorageState
) => ({ storageKey, defaultState }: StateCounterProps) => {
  const [state, setState, writeError] = useStorageState(
    storageKey,
    defaultState
  );

  return (
    <Counter
      value={state && state.count}
      onIncrement={() => {
        setState(prevState => ({ count: prevState.count + 1 }));
      }}
      onReset={() => {
        setState({ count: 0 });
      }}
      writeErrorMessage={writeError && writeError.message}
    />
  );
};

type CountAction = { type: 'add'; payload: number } | { type: 'reset' };

const reducer = (state: CountState, action: CountAction) => {
  switch (action.type) {
    case 'add':
      return { count: state.count + action.payload };
    case 'reset':
      return { count: 0 };
  }
};

type ReducerCounterProps = {
  storageKey: string;
  initializerArg: CountState;
  initializer?: (arg: CountState) => CountState;
};

export const createCounterComponentWithReducer = (
  useStorageReducer: typeof useLocalStorageReducer
) => ({ storageKey, initializerArg, initializer }: ReducerCounterProps) => {
  const [state, dispatch, writeError] = useStorageReducer(
    storageKey,
    reducer,
    initializerArg,
    initializer
  );

  return (
    <Counter
      value={state && state.count}
      onIncrement={() => {
        dispatch({ type: 'add', payload: 1 });
      }}
      onReset={() => {
        dispatch({ type: 'reset' });
      }}
      writeErrorMessage={writeError && writeError.message}
    />
  );
};
