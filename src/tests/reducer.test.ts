import { renderHook, act } from '@testing-library/react-hooks';

import { useStorageReducer } from '..';
import {
  mockStorageError,
  mockStorageErrorOnce,
  fireStorageEvent,
} from './utils';

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

function reducer(state: { value: number }, action: { type: 'inc' | 'dec' }) {
  switch (action.type) {
    case 'inc':
      return { value: state.value + 1 };
    case 'dec':
      return { value: state.value - 1 };
    default:
      return state;
  }
}

describe('initialization', () => {
  it('returns storage value when available', () => {
    localStorage.setItem('key', '{"value":1}');

    const { result } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, {
        value: 0,
      })
    );

    const [state] = result.current;
    expect(state).toStrictEqual({ value: 1 });
  });

  it('returns default state when storage empty and writes it to storage', () => {
    const { result } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, { value: 0 })
    );

    const [state] = result.current;
    expect(state).toStrictEqual({ value: 0 });
    expect(localStorage.getItem('key')).toBe('{"value":0}');
  });

  it('returns default state when storage empty and writes it to storage (lazy initialization)', () => {
    const { result } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, 0, value => ({ value }))
    );

    const [state] = result.current;
    expect(state).toStrictEqual({ value: 0 });
    expect(localStorage.getItem('key')).toBe('{"value":0}');
  });

  it('returns default state when storage reading fails', () => {
    mockStorageErrorOnce(localStorage, 'getItem', 'Error message');
    localStorage.setItem('key', '{"value":1}');

    const { result } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, { value: 0 })
    );

    const {
      current: [state],
    } = result;
    expect(state).toStrictEqual({ value: 0 });
  });
});

describe('updates', () => {
  it('returns new state and writes to storage', () => {
    const { result } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, { value: 0 })
    );
    const [, dispatch] = result.current;
    act(() => dispatch({ type: 'inc' }));

    const [newState] = result.current;
    expect(newState).toStrictEqual({ value: 1 });
    expect(localStorage.getItem('key')).toBe('{"value":1}');
  });

  it('returns new state and write error when storage writing fails once', async () => {
    mockStorageErrorOnce(localStorage, 'setItem', 'Error message');

    const { result, waitForNextUpdate } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, { value: 0 })
    );
    const [, dispatch] = result.current;
    act(() => dispatch({ type: 'inc' }));
    await waitForNextUpdate();

    const [newState, , writeError] = result.current;
    expect(newState).toStrictEqual({ value: 1 });
    expect(writeError).toEqual(Error('Error message'));
  });

  it('returns new state and previous write error when storage writing fails multiple times', async () => {
    mockStorageError(localStorage, 'setItem', 'Error message');

    const { result, waitForNextUpdate } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, { value: 0 })
    );
    const [, dispatch] = result.current;
    act(() => dispatch({ type: 'inc' }));
    await waitForNextUpdate();

    const [, newDispatch, writeError] = result.current;
    expect(writeError).toEqual(Error('Error message'));

    act(() => newDispatch({ type: 'inc' }));
    await waitForNextUpdate();

    const [, , newWriteError] = result.current;
    expect(newWriteError).toEqual(Error('Error message'));
  });

  it('returns new state and no previous write error when storage writing works after failing', async () => {
    mockStorageErrorOnce(localStorage, 'setItem', 'Error message');

    const { result, waitForNextUpdate } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, { value: 0 })
    );
    const [, dispatch] = result.current;
    act(() => dispatch({ type: 'inc' }));
    await waitForNextUpdate();

    const [, newDispatch, writeError] = result.current;
    expect(writeError).toEqual(Error('Error message'));

    act(() => newDispatch({ type: 'inc' }));

    const [, , newWriteError] = result.current;
    expect(newWriteError).toBeUndefined();
  });

  it('returns same state when default state changes', () => {
    localStorage.setItem('key', '{"value":1}');

    const { result, rerender } = renderHook(
      defaultState =>
        useStorageReducer(localStorage, 'key', reducer, defaultState),
      { initialProps: { value: 0 } }
    );
    rerender({ value: 2 });

    const [newState] = result.current;
    expect(newState).toStrictEqual({ value: 1 });
  });

  it('returns same state when storage empty and default state changes', () => {
    const { result, rerender } = renderHook(
      defaultState =>
        useStorageReducer(localStorage, 'key', reducer, defaultState),
      { initialProps: { value: 0 } }
    );
    rerender({ value: 1 });

    const [newState] = result.current;
    expect(newState).toStrictEqual({ value: 0 });
  });

  it('returns new state when storage event fired for key', () => {
    const { result } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, { value: 0 })
    );

    act(() => fireStorageEvent('key', '{"value":1}'));

    const [newState] = result.current;
    expect(newState).toStrictEqual({ value: 1 });
  });

  it('returns same state when storage event fired for key and storage empty', () => {
    const { result } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, { value: 0 })
    );

    act(() => fireStorageEvent('key', null));

    const [newState] = result.current;
    expect(newState).toStrictEqual({ value: 0 });
  });

  it('returns same state when storage event fired for other key', () => {
    const { result } = renderHook(() =>
      useStorageReducer(localStorage, 'key', reducer, { value: 0 })
    );

    act(() => {
      fireStorageEvent('other-key', '{"value":1}');
    });

    const [newState] = result.current;
    expect(newState).toStrictEqual({ value: 0 });
  });
});

describe('resetting', () => {
  it('returns new storage value when key changes and storage value available', () => {
    localStorage.setItem('new-key', '{"value":1}');

    const { result, rerender } = renderHook(
      key => useStorageReducer(localStorage, key, reducer, { value: 0 }),
      {
        initialProps: 'key',
      }
    );
    rerender('new-key');

    const [newState] = result.current;
    expect(newState).toStrictEqual({ value: 1 });
  });

  it('returns default state when key changes and storage empty', () => {
    localStorage.setItem('key', '{"value":1}');

    const { result, rerender } = renderHook(
      key => useStorageReducer(localStorage, key, reducer, { value: 0 }),
      {
        initialProps: 'key',
      }
    );
    rerender('new-key');

    const [newState] = result.current;
    expect(newState).toStrictEqual({ value: 0 });
  });

  it('returns no previous write error when key changes', async () => {
    mockStorageErrorOnce(localStorage, 'setItem', 'Error message');

    const { result, rerender, waitForNextUpdate } = renderHook(
      key => useStorageReducer(localStorage, key, reducer, { value: 0 }),
      { initialProps: 'key' }
    );
    const [, dispatch] = result.current;
    act(() => dispatch({ type: 'inc' }));
    await waitForNextUpdate();

    const [, , writeError] = result.current;
    expect(writeError).toEqual(Error('Error message'));

    rerender('new-key');

    const [, , newWriteError] = result.current;
    expect(newWriteError).toBeUndefined();
  });

  it('writes to new key when key changes', () => {
    localStorage.setItem('key', '{"value":1}');
    localStorage.setItem('new-key', '{"value":2}');

    const { result, rerender } = renderHook(
      key => useStorageReducer(localStorage, key, reducer, { value: 0 }),
      {
        initialProps: 'key',
      }
    );
    rerender('new-key');
    const [, dispatch] = result.current;
    act(() => dispatch({ type: 'inc' }));

    expect(localStorage.getItem('key')).toStrictEqual('{"value":1}');
    expect(localStorage.getItem('new-key')).toStrictEqual('{"value":3}');
  });
});
