import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  wait,
  waitForElement,
} from 'react-testing-library';
import {
  createCounterComponentWithState,
  createCounterComponentWithReducer,
  INCREMENT_BUTTON_TEXT,
  RESET_BUTTON_TEXT,
} from './test-components';
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
const SOME_STORAGE_ERROR_MESSAGE = 'Storage error';

const createReadFromStorage = (storage: Storage) => (key: string) =>
  storage.getItem(key);
const createWriteToStorage = (storage: Storage) => (
  key: string,
  value: string
) => storage.setItem(key, value);
const localStorageMethods = {
  readFromStorage: createReadFromStorage(localStorage),
  writeToStorage: createWriteToStorage(localStorage),
};
const sessionStorageMethods = {
  readFromStorage: createReadFromStorage(sessionStorage),
  writeToStorage: createWriteToStorage(sessionStorage),
};

const fireStorageEvent = (key: string, value: string) => {
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

describe('Browser environment', () => {
  [
    {
      component: createCounterComponentWithState(useLocalStorageState),
      hookName: 'useLocalStorageState',
      ...localStorageMethods,
    },
    {
      component: createCounterComponentWithState(useSessionStorageState),
      hookName: 'useSessionStorageState',
      ...sessionStorageMethods,
    },
  ].forEach(
    ({ component: Component, hookName, readFromStorage, writeToStorage }) => {
      describe(hookName, () => {
        test('uses storage data as initial state if available', () => {
          writeToStorage(SOME_STORAGE_KEY, '{"count":5}');

          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );

          getByText('5');
        });

        test('uses default state as initial state if empty storage', () => {
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );

          getByText('0');
        });

        test('uses default state as initial state if reading from storage fails', () => {
          mockStorageError('getItem', SOME_STORAGE_ERROR_MESSAGE);

          const renderComponent = () =>
            render(
              <Component
                storageKey={SOME_STORAGE_KEY}
                defaultState={{ count: 0 }}
              />
            );

          expect(renderComponent).not.toThrow(SOME_STORAGE_ERROR_MESSAGE);
          renderComponent().getByText('0');
        });

        test('uses return of default state function as initial state if empty storage (lazy initialization)', () => {
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={() => ({ count: 0 })}
            />
          );

          getByText('0');
        });

        test('updates state and writes to storage', async () => {
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={{ count: 5 }}
            />
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
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );

          fireEvent.click(getByText(INCREMENT_BUTTON_TEXT));

          getByText('1');
          await waitForElement(() => getByText(SOME_STORAGE_ERROR_MESSAGE));
        });

        test('updates state with new default state if provided key changes', async () => {
          const { getByText, rerender } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );
          rerender(
            <Component
              storageKey={OTHER_STORAGE_KEY}
              defaultState={{ count: 5 }}
            />
          );

          await waitForElement(() => getByText('5'));
        });

        test('updates state with new storage data if provided key changes', async () => {
          writeToStorage(OTHER_STORAGE_KEY, '{"count":5}');

          const { getByText, rerender } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );
          rerender(
            <Component
              storageKey={OTHER_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );

          await waitForElement(() => getByText('5'));
        });

        test('writes to new key instead of previous one if provided key changes', async () => {
          writeToStorage(SOME_STORAGE_KEY, '{"count":1}');
          writeToStorage(OTHER_STORAGE_KEY, '{"count":5}');

          const { getByText, rerender } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );
          rerender(
            <Component
              storageKey={OTHER_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );

          await waitForElement(() => getByText('5'));
          expect(readFromStorage(OTHER_STORAGE_KEY)).toBe('{"count":5}');
          expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":1}');
        });

        test('clears previous write error if provided key changes', () => {
          mockStorageError('setItem', SOME_STORAGE_ERROR_MESSAGE);

          const { getByText, queryByText, rerender } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );
          fireEvent.click(getByText(INCREMENT_BUTTON_TEXT));
          rerender(
            <Component
              storageKey={OTHER_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );

          expect(queryByText(SOME_STORAGE_ERROR_MESSAGE)).toBeNull();
        });

        test('updates state when storage event for matching key is fired', () => {
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );

          fireStorageEvent(SOME_STORAGE_KEY, '{"count":10}');

          getByText('10');
        });

        test('does not update state when storage event for different key is fired', () => {
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              defaultState={{ count: 0 }}
            />
          );

          fireStorageEvent(OTHER_STORAGE_KEY, '{"count":10}');

          getByText('0');
        });
      });
    }
  );

  [
    {
      component: createCounterComponentWithReducer(useLocalStorageReducer),
      hookName: 'useLocalStorageReducer',
      ...localStorageMethods,
    },
    {
      component: createCounterComponentWithReducer(useSessionStorageReducer),
      hookName: 'useSessionStorageReducer',
      ...sessionStorageMethods,
    },
  ].forEach(
    ({ hookName, component: Component, readFromStorage, writeToStorage }) => {
      describe(hookName, () => {
        test('uses storage data as initial state if available', () => {
          writeToStorage(SOME_STORAGE_KEY, '{"count":5}');

          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );

          getByText('5');
        });

        test('uses initial state if empty storage', () => {
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );

          getByText('0');
        });

        test('uses initial state if reading from storage fails', () => {
          mockStorageError('getItem', SOME_STORAGE_ERROR_MESSAGE);

          const renderComponent = () =>
            render(
              <Component
                storageKey={SOME_STORAGE_KEY}
                initializerArg={{ count: 0 }}
              />
            );

          expect(renderComponent).not.toThrow(SOME_STORAGE_ERROR_MESSAGE);
          renderComponent().getByText('0');
        });

        test('applies initializer to storage data (lazy initialization)', async () => {
          writeToStorage(SOME_STORAGE_KEY, '{"count":5}');
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
              initializer={({ count }) => ({ count: count + 10 })}
            />
          );
          getByText('15');
          await wait();
          expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":15}');
        });
        test('applies initializer to initial state (lazy initialization)', async () => {
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
              initializer={({ count }) => ({ count: count + 10 })}
            />
          );
          getByText('10');
          await wait();
          expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":10}');
        });

        test('updates state and writes to storage', async () => {
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 5 }}
            />
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
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );

          fireEvent.click(getByText(INCREMENT_BUTTON_TEXT));

          getByText('1');
          await waitForElement(() => getByText(SOME_STORAGE_ERROR_MESSAGE));
        });

        test('updates state with new initial state if provided key changes', async () => {
          const { getByText, rerender } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );
          rerender(
            <Component
              storageKey={OTHER_STORAGE_KEY}
              initializerArg={{ count: 5 }}
            />
          );

          await waitForElement(() => getByText('5'));
        });

        test('updates state with new storage data if provided key changes', async () => {
          writeToStorage(OTHER_STORAGE_KEY, '{"count":5}');

          const { getByText, rerender } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );
          rerender(
            <Component
              storageKey={OTHER_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );

          await waitForElement(() => getByText('5'));
        });

        test('writes to new key instead of previous one if provided key changes', async () => {
          writeToStorage(SOME_STORAGE_KEY, '{"count":1}');
          writeToStorage(OTHER_STORAGE_KEY, '{"count":5}');

          const { getByText, rerender } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );
          rerender(
            <Component
              storageKey={OTHER_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );

          await waitForElement(() => getByText('5'));
          expect(readFromStorage(OTHER_STORAGE_KEY)).toBe('{"count":5}');
          expect(readFromStorage(SOME_STORAGE_KEY)).toBe('{"count":1}');
        });

        test('clears previous write error if provided key changes', () => {
          mockStorageError('setItem', SOME_STORAGE_ERROR_MESSAGE);

          const { getByText, queryByText, rerender } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );
          fireEvent.click(getByText(INCREMENT_BUTTON_TEXT));
          rerender(
            <Component
              storageKey={OTHER_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );

          expect(queryByText(SOME_STORAGE_ERROR_MESSAGE)).toBeNull();
        });

        test('updates state when storage event for matching key is fired', () => {
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );

          fireStorageEvent(SOME_STORAGE_KEY, '{"count":10}');

          getByText('10');
        });

        test('does not update state when storage event for different key is fired', () => {
          const { getByText } = render(
            <Component
              storageKey={SOME_STORAGE_KEY}
              initializerArg={{ count: 0 }}
            />
          );

          fireStorageEvent(OTHER_STORAGE_KEY, '{"count":10}');

          getByText('0');
        });
      });
    }
  );
});
