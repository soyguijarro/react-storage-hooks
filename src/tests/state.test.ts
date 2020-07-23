import { renderHook, act } from '@testing-library/react-hooks';

import { useStorageState } from '..';
import {
  mockStorageError,
  mockStorageErrorOnce,
  fireStorageEvent,
} from './utils';

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('initialization', () => {
  it.only('returns storage value when available', async () => {
    localStorage.setItem('key', '{"value":1}');

    const { result, waitForNextUpdate } = renderHook(() =>
      useStorageState(localStorage, 'key', { value: 0 })
    );

    const {
      state: beforeUpdateState,
      isLoading: beforeUpdateIsLoading,
      isError: beforeUpdateIsError,
    } = result.current;
    expect(beforeUpdateIsLoading).toBe(true)
    expect(beforeUpdateIsError).toBe(false)
    expect(beforeUpdateState).toBeUndefined()

    await waitForNextUpdate();

    const {
      state: afterUpdateState,
      isLoading: afterUpdateIsLoading,
      isError: afterUpdateIsError,
    } = result.current;
    expect(afterUpdateIsLoading).toBe(false)
    expect(afterUpdateIsError).toBe(false)
    expect(afterUpdateState).toStrictEqual({ value: 1 });
  });

  it('returns default state when storage empty and writes it to storage', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useStorageState(localStorage, 'key', { value: 0 })
    );

    await waitForNextUpdate();

    const { state } = result.current;
    expect(state).toStrictEqual({ value: 0 });
    expect(localStorage.getItem('key')).toBe('{"value":0}');
  });

  it('returns default state when storage empty and writes it to storage (lazy initialization)', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useStorageState(localStorage, 'key', () => ({ value: 0 }))
    );

    await waitForNextUpdate();

    const { state } = result.current;
    expect(state).toStrictEqual({ value: 0 });
    expect(localStorage.getItem('key')).toBe('{"value":0}');
  });

  it('returns null when storage empty and no default provided', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useStorageState(localStorage, 'key'));

    await waitForNextUpdate();

    const { state } = result.current;
    expect(state).toBeNull();
  });

  it('returns default state when storage reading fails', async () => {
    mockStorageErrorOnce(localStorage, 'getItem', 'Error message');
    localStorage.setItem('key', '{"value":1}');

    const { result, waitForNextUpdate } = renderHook(() =>
      useStorageState(localStorage, 'key', { value: 0 })
    );

    await waitForNextUpdate();

    const {
      current: { state },
    } = result;
    expect(state).toStrictEqual({ value: 0 });
  });

  it('returns null when storage reading fails and no default provided', () => {
    mockStorageErrorOnce(localStorage, 'getItem', 'Error message');
    localStorage.setItem('key', '{"value":1}');

    const { result } = renderHook(() => useStorageState(localStorage, 'key'));

    const {
      current: { state },
    } = result;
    expect(state).toBeNull();
  });
});

describe('updates', () => {
  it.only('returns new state and writes to storage', () => {
    const { result } = renderHook(() =>
      useStorageState(localStorage, 'key', { value: 0 })
    );
    const { setState } = result.current;
    act(() => setState({ value: 1 }));

    const { state: newState } = result.current;
    expect(newState).toStrictEqual({ value: 1 });
    expect(localStorage.getItem('key')).toBe('{"value":1}');
  });

  it('returns new state and write error when storage writing fails once', async () => {
    mockStorageErrorOnce(localStorage, 'setItem', 'Error message');

    const { result, waitForNextUpdate } = renderHook(() =>
      useStorageState(localStorage, 'key', { value: 0 })
    );
    const { setState } = result.current;
    act(() => setState({ value: 1 }));
    await waitForNextUpdate();

    const { state: newState, error: writeError } = result.current;
    expect(newState).toStrictEqual({ value: 1 });
    expect(writeError).toEqual(Error('Error message'));
  });

  it('returns new state and previous write error when storage writing fails multiple times', async () => {
    mockStorageError(localStorage, 'setItem', 'Error message');

    const { result, waitForNextUpdate } = renderHook(() =>
      useStorageState(localStorage, 'key', { value: 0 })
    );
    const { setState } = result.current;
    act(() => setState({ value: 1 }));
    await waitForNextUpdate();

    const { setState: newSetState, error: writeError } = result.current;
    expect(writeError).toEqual(Error('Error message'));

    act(() => newSetState({ value: 2 }));
    await waitForNextUpdate();

    const { error: newWriteError } = result.current;
    expect(newWriteError).toEqual(Error('Error message'));
  });

  it('returns new state and no previous write error when storage writing works after failing', async () => {
    mockStorageErrorOnce(localStorage, 'setItem', 'Error message');

    const { result, waitForNextUpdate } = renderHook(() =>
      useStorageState(localStorage, 'key', { value: 0 })
    );
    const { setState } = result.current;
    act(() => setState({ value: 1 }));
    await waitForNextUpdate();

    const { setState: newSetState, error: writeError } = result.current;
    expect(writeError).toEqual(Error('Error message'));

    act(() => newSetState({ value: 2 }));

    const { error: newWriteError } = result.current;
    expect(newWriteError).toBeUndefined();
  });

  it('returns same state when default state changes', () => {
    localStorage.setItem('key', '{"value":1}');

    const { result, rerender } = renderHook(
      defaultState => useStorageState(localStorage, 'key', defaultState),
      { initialProps: { value: 0 } }
    );
    rerender({ value: 2 });

    const { state: newState } = result.current;
    expect(newState).toStrictEqual({ value: 1 });
  });

  it('returns same state when storage empty and default state changes', () => {
    const { result, rerender } = renderHook(
      defaultState => useStorageState(localStorage, 'key', defaultState),
      { initialProps: { value: 0 } }
    );
    rerender({ value: 1 });

    const { state: newState } = result.current;
    expect(newState).toStrictEqual({ value: 0 });
  });

  it('returns null and removes key from storage when null provided', () => {
    localStorage.setItem('key', '{"value":1}');

    const { result } = renderHook(() =>
      useStorageState<{ value: number } | null>(localStorage, 'key', {
        value: 0,
      })
    );
    const { setState } = result.current;
    act(() => setState(null));

    const { state: newState } = result.current;
    expect(newState).toBeNull();
    expect(localStorage.getItem('key')).toBeNull();
  });

  it('returns new state when storage event fired for key', () => {
    const { result } = renderHook(() =>
      useStorageState(localStorage, 'key', 0)
    );

    act(() => fireStorageEvent('key', '{"value":1}'));

    const { state: newState } = result.current;
    expect(newState).toStrictEqual({ value: 1 });
  });

  it('returns same state when storage event fired for key and storage empty', () => {
    const { result } = renderHook(() =>
      useStorageState(localStorage, 'key', { value: 0 })
    );

    act(() => fireStorageEvent('key', null));

    const { state: newState } = result.current;
    expect(newState).toStrictEqual({ value: 0 });
  });

  it('returns same state when storage event fired for other key', () => {
    const { result } = renderHook(() =>
      useStorageState(localStorage, 'key', { value: 0 })
    );

    act(() => {
      fireStorageEvent('other-key', '{"value":1}');
    });

    const { state: newState } = result.current;
    expect(newState).toStrictEqual({ value: 0 });
  });
});

describe('resetting', () => {
  it('returns new storage value when key changes and storage value available', () => {
    localStorage.setItem('new-key', '{"value":1}');

    const { result, rerender } = renderHook(
      key => useStorageState(localStorage, key, { value: 0 }),
      {
        initialProps: 'key',
      }
    );
    rerender('new-key');

    const { state: newState } = result.current;
    expect(newState).toStrictEqual({ value: 1 });
  });

  it('returns default state when key changes and storage empty', () => {
    localStorage.setItem('key', '1');

    const { result, rerender } = renderHook(
      key => useStorageState(localStorage, key, { value: 0 }),
      {
        initialProps: 'key',
      }
    );
    rerender('new-key');

    const { state: newState } = result.current;
    expect(newState).toStrictEqual({ value: 0 });
  });

  it('returns null when key changes, storage empty and no default provided', () => {
    localStorage.setItem('key', '{"value":1}');

    const { result, rerender } = renderHook(
      key => useStorageState(localStorage, key),
      {
        initialProps: 'key',
      }
    );
    rerender('new-key');

    const { state: newState } = result.current;
    expect(newState).toBeNull();
  });

  it('returns no previous write error when key changes', async () => {
    mockStorageErrorOnce(localStorage, 'setItem', 'Error message');

    const { result, rerender, waitForNextUpdate } = renderHook(
      key => useStorageState(localStorage, key, { value: 0 }),
      { initialProps: 'key' }
    );
    const { setState } = result.current;
    act(() => setState({ value: 1 }));
    await waitForNextUpdate();

    const { error: writeError } = result.current;
    expect(writeError).toEqual(Error('Error message'));

    rerender('new-key');

    const { error: newWriteError } = result.current;
    expect(newWriteError).toBeUndefined();
  });

  it('writes to new key when key changes', () => {
    localStorage.setItem('key', '{"value":1}');
    localStorage.setItem('new-key', '{"value":2}');

    const { result, rerender } = renderHook(
      key => useStorageState(localStorage, key, { value: 0 }),
      {
        initialProps: 'key',
      }
    );
    rerender('new-key');
    const { setState } = result.current;
    act(() => setState({ value: 3 }));

    expect(localStorage.getItem('key')).toBe('{"value":1}');
    expect(localStorage.getItem('new-key')).toBe('{"value":3}');
  });
});
