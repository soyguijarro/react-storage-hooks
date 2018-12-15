import React, { Fragment } from 'react';
import {
  cleanup,
  fireEvent,
  flushEffects,
  render,
  waitForElement,
} from 'react-testing-library';
import { useStorageReducer, useStorageState } from './index';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const SOME_STORAGE_KEY = 'count';
const OTHER_STORAGE_KEY = 'other-count';
const INCREMENT_BUTTON_TEXT = '+';
const RESET_BUTTON_TEXT = 'Reset';
const SOME_STORAGE_ERROR_MESSAGE = 'Storage error';

const readFromStorage = key => localStorage.getItem(key);
const writeToStorage = (key, value) => localStorage.setItem(key, value);
const fireStorageEvent = (key, value) => {
  fireEvent(window, new StorageEvent('storage', { key, newValue: value }));
};
const mockStorageError = (method, error) => {
  // Cannot mock localStorage methods directly: https://github.com/facebook/jest/issues/6798
  jest.spyOn(Storage.prototype, method).mockImplementationOnce(() => {
    throw new Error(error);
  });
};

const Counter = ({ value, onIncrement, onReset, writeError }) => (
  <Fragment>
    {value && <p id="value">{value}</p>}
    <button onClick={onIncrement}>{INCREMENT_BUTTON_TEXT}</button>
    <button onClick={onReset}>{RESET_BUTTON_TEXT}</button>
    {writeError && <p>{writeError}</p>}
  </Fragment>
);

const StateCounter = ({ storageKey, defaultState }) => {
  const [state, setState, writeError] = useStorageState(
    storageKey,
    defaultState
  );

  return (
    <Counter
      value={state && state.count}
      onIncrement={() =>
        setState(prevState => ({ count: prevState.count + 1 }))
      }
      onReset={() => setState({ count: 0 })}
      writeError={writeError && writeError.message}
    />
  );
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'add':
      return { count: state.count + action.payload };
    case 'reset':
      return { count: 0 };
    default:
      return state;
  }
};

const ReducerCounter = ({ storageKey, defaultState, initialAction }) => {
  const [state, dispatch, writeError] = useStorageReducer(
    storageKey,
    reducer,
    defaultState,
    initialAction
  );

  return (
    <Counter
      value={state && state.count}
      onIncrement={() => dispatch({ type: 'add', payload: 1 })}
      onReset={() => dispatch({ type: 'reset' })}
      writeError={writeError && writeError.message}
    />
  );
};

describe.each([
  ['useStorageState', StateCounter],
  ['useStorageReducer', ReducerCounter],
])('%s', (hook, Component) => {
  test('uses storage data as initial state if available', () => {
    writeToStorage(SOME_STORAGE_KEY, '{"count":5}');

    const { getByText } = render(
      <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 0 }} />
    );

    getByText('5');
  });

  test('uses default state as initial state if empty storage', () => {
    const { getByText } = render(
      <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 0 }} />
    );

    getByText('0');
  });

  test('uses default state as initial state if reading from storage fails', () => {
    mockStorageError('getItem', SOME_STORAGE_ERROR_MESSAGE);

    const renderComponent = () =>
      render(
        <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 0 }} />
      );

    expect(renderComponent).not.toThrow(SOME_STORAGE_ERROR_MESSAGE);
    renderComponent().getByText('0');
  });

  if (hook === 'useStorageState') {
    test('uses return of default state function as initial state if empty storage (lazy initialization)', () => {
      const { getByText } = render(
        <StateCounter
          storageKey={SOME_STORAGE_KEY}
          defaultState={() => ({ count: 0 })}
        />
      );

      getByText('0');
    });
  } else {
    test('dispatches initial action if provided (lazy initialization)', () => {
      writeToStorage(SOME_STORAGE_KEY, '{"count":5}');

      const { getByText } = render(
        <ReducerCounter
          storageKey={SOME_STORAGE_KEY}
          defaultState={{ count: 0 }}
          initialAction={{ type: 'add', payload: 5 }}
        />
      );

      getByText('10');
      expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":10}');
    });
  }

  test('updates state and writes to storage', () => {
    const { getByText } = render(
      <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 5 }} />
    );

    fireEvent.click(getByText(INCREMENT_BUTTON_TEXT));

    getByText('6');
    expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":6}');

    fireEvent.click(getByText(RESET_BUTTON_TEXT));

    getByText('0');
    expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":0}');
  });

  test('updates state and write error if writing to storage fails', async () => {
    mockStorageError('setItem', SOME_STORAGE_ERROR_MESSAGE);

    const { getByText } = render(
      <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 0 }} />
    );

    fireEvent.click(getByText(INCREMENT_BUTTON_TEXT));

    getByText('1');
    await waitForElement(() => getByText(SOME_STORAGE_ERROR_MESSAGE));
  });

  test('updates state with new default state if provided key changes', () => {
    const { getByText, rerender } = render(
      <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 0 }} />
    );
    rerender(
      <Component storageKey={OTHER_STORAGE_KEY} defaultState={{ count: 5 }} />
    );

    getByText('5');
  });

  test('updates state with new storage data if provided key changes', () => {
    writeToStorage(OTHER_STORAGE_KEY, '{"count":5}');

    const { getByText, rerender } = render(
      <Component storageKey={SOME_STORAGE_KEY} />
    );
    rerender(<Component storageKey={OTHER_STORAGE_KEY} />);

    getByText('5');
  });

  test('writes to new key instead of previous one if provided key changes', () => {
    writeToStorage(SOME_STORAGE_KEY, '{"count":1}');
    writeToStorage(OTHER_STORAGE_KEY, '{"count":5}');

    const { getByText, rerender } = render(
      <Component storageKey={SOME_STORAGE_KEY} />
    );
    rerender(<Component storageKey={OTHER_STORAGE_KEY} />);
    fireEvent.click(getByText(INCREMENT_BUTTON_TEXT));

    getByText('6');
    expect(readFromStorage(OTHER_STORAGE_KEY)).toBe('{"count":6}');
    expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":1}');
  });

  test('clears previous write error if provided key changes', () => {
    mockStorageError('setItem', SOME_STORAGE_ERROR_MESSAGE);

    const { getByText, queryByText, rerender } = render(
      <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 0 }} />
    );
    fireEvent.click(getByText(INCREMENT_BUTTON_TEXT));
    rerender(
      <Component storageKey={OTHER_STORAGE_KEY} defaultState={{ count: 0 }} />
    );

    expect(queryByText(SOME_STORAGE_ERROR_MESSAGE)).toBeNull();
  });

  test('updates state when storage event for matching key is fired', () => {
    const { getByText } = render(
      <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 0 }} />
    );
    flushEffects();

    fireStorageEvent(SOME_STORAGE_KEY, '{"count":10}');

    getByText('10');
  });

  test('does not update state when storage event for different key is fired', () => {
    const { getByText } = render(
      <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 0 }} />
    );
    flushEffects();

    fireStorageEvent('random-key', '{"count":10}');

    getByText('0');
  });
});
