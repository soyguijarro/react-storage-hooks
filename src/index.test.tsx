import React, { Fragment } from 'react';
import {
  cleanup,
  fireEvent,
  flushEffects,
  render,
  wait,
  waitForElement,
} from 'react-testing-library';
import {
  useLocalStorageState,
  useLocalStorageReducer,
  useSessionStorageState,
  useSessionStorageReducer,
} from './index';

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

const SOME_STORAGE_KEY = 'count';
const OTHER_STORAGE_KEY = 'other-count';
const INCREMENT_BUTTON_TEXT = '+';
const RESET_BUTTON_TEXT = 'Reset';
const SOME_STORAGE_ERROR_MESSAGE = 'Storage error';

const createReadFromStorage = (storage: Storage) => (key: string) =>
  storage.getItem(key);
const createWriteToStorage = (storage: Storage) => (key: string, value: any) =>
  storage.setItem(key, value);
const localStorageMethods = {
  readFromStorage: createReadFromStorage(localStorage),
  writeToStorage: createWriteToStorage(localStorage),
};
const sessionStorageMethods = {
  readFromStorage: createReadFromStorage(sessionStorage),
  writeToStorage: createWriteToStorage(sessionStorage),
};

const fireStorageEvent = (key: string, value: any) => {
  fireEvent(window, new StorageEvent('storage', { key, newValue: value }));
};
const mockStorageError = (
  method: 'getItem' | 'setItem',
  errorMessage: string
) => {
  // Cannot mock Storage methods directly: https://github.com/facebook/jest/issues/6798
  jest.spyOn(Storage.prototype, method).mockImplementationOnce(() => {
    throw new Error(errorMessage);
  });
};

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
    {value && <p id="value">{value}</p>}
    <button onClick={onIncrement}>{INCREMENT_BUTTON_TEXT}</button>
    <button onClick={onReset}>{RESET_BUTTON_TEXT}</button>
    {writeErrorMessage && <p>{writeErrorMessage}</p>}
  </Fragment>
);

type StateCounterProps = {
  storageKey: string;
  defaultState: CountState;
};

const createStateCounter = (useStorageState: typeof useLocalStorageState) => ({
  storageKey,
  defaultState,
}: StateCounterProps) => {
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
    default:
      return state;
  }
};

type ReducerCounterProps = {
  storageKey: string;
  defaultState: CountState;
  initialAction: CountAction | undefined;
};

const createReducerCounter = (
  useStorageReducer: typeof useLocalStorageReducer
) => ({ storageKey, defaultState, initialAction }: ReducerCounterProps) => {
  const [state, dispatch, writeError] = useStorageReducer(
    storageKey,
    reducer,
    defaultState,
    initialAction
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

describe.each([
  [
    'useLocalStorageState',
    createStateCounter(useLocalStorageState),
    localStorageMethods,
  ],
  [
    'useLocalStorageReducer',
    createReducerCounter(useLocalStorageReducer),
    localStorageMethods,
  ],
  [
    'useSessionStorageState',
    createStateCounter(useSessionStorageState),
    sessionStorageMethods,
  ],
  [
    'useSessionStorageReducer',
    createReducerCounter(useSessionStorageReducer),
    sessionStorageMethods,
  ],
])('%s', (hookName, Component, { readFromStorage, writeToStorage }) => {
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

  if (['useLocalStorageState', 'useSessionStorageState'].includes(hookName)) {
    test('uses return of default state function as initial state if empty storage (lazy initialization)', () => {
      const { getByText } = render(
        <Component
          storageKey={SOME_STORAGE_KEY}
          defaultState={() => ({ count: 0 })}
        />
      );

      getByText('0');
    });
  } else {
    test('applies provided initial action to storage data (lazy initialization)', async () => {
      writeToStorage(SOME_STORAGE_KEY, '{"count":5}');

      const { getByText } = render(
        <Component
          storageKey={SOME_STORAGE_KEY}
          defaultState={{ count: 0 }}
          initialAction={{ type: 'add', payload: 10 }}
        />
      );

      getByText('15');
      await wait();
      expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":15}');
    });

    test('applies provided initial action to default state (lazy initialization)', async () => {
      const { getByText } = render(
        <Component
          storageKey={SOME_STORAGE_KEY}
          defaultState={{ count: 0 }}
          initialAction={{ type: 'add', payload: 10 }}
        />
      );

      getByText('10');
      await wait();
      expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":10}');
    });
  }

  test('updates state and writes to storage', async () => {
    const { getByText } = render(
      <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 5 }} />
    );

    fireEvent.click(getByText(INCREMENT_BUTTON_TEXT));

    getByText('6');
    await wait();
    expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":6}');

    fireEvent.click(getByText(RESET_BUTTON_TEXT));

    getByText('0');
    await wait();
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

  test('updates state with new default state if provided key changes', async () => {
    const { getByText, rerender } = render(
      <Component storageKey={SOME_STORAGE_KEY} defaultState={{ count: 0 }} />
    );
    rerender(
      <Component storageKey={OTHER_STORAGE_KEY} defaultState={{ count: 5 }} />
    );

    await waitForElement(() => getByText('5'));
  });

  test('updates state with new storage data if provided key changes', async () => {
    writeToStorage(OTHER_STORAGE_KEY, '{"count":5}');

    const { getByText, rerender } = render(
      <Component storageKey={SOME_STORAGE_KEY} />
    );
    rerender(<Component storageKey={OTHER_STORAGE_KEY} />);

    await waitForElement(() => getByText('5'));
  });

  test('writes to new key instead of previous one if provided key changes', async () => {
    writeToStorage(SOME_STORAGE_KEY, '{"count":1}');
    writeToStorage(OTHER_STORAGE_KEY, '{"count":5}');

    const { getByText, rerender } = render(
      <Component storageKey={SOME_STORAGE_KEY} />
    );
    rerender(<Component storageKey={OTHER_STORAGE_KEY} />);

    await waitForElement(() => getByText('5'));
    expect(readFromStorage(OTHER_STORAGE_KEY)).toBe('{"count":5}');
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

    fireStorageEvent(OTHER_STORAGE_KEY, '{"count":10}');

    getByText('0');
  });
});
