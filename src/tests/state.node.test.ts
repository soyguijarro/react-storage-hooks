/**
 * @jest-environment node
 */

import { renderHook } from '@testing-library/react-hooks';

import { useStorageState } from '..';
import { storageLikeObject } from './utils';

it('returns default state', () => {
  const { result } = renderHook(() =>
    useStorageState(storageLikeObject, 'key', { value: 0 })
  );
  const [state] = result.current;
  expect(state).toStrictEqual({ value: 0 });
});

it('returns default state (lazy initialization)', () => {
  const { result } = renderHook(() =>
    useStorageState(storageLikeObject, 'key', () => ({ value: 0 }))
  );

  const [state] = result.current;
  expect(state).toStrictEqual({ value: 0 });
});
