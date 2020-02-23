/**
 * @jest-environment node
 */

import { renderHook } from '@testing-library/react-hooks';

import { useStorageReducer } from '..';
import { storageLikeObject } from './utils';

function reducer(state: { value: number }) {
  return state;
}

it('returns default state', () => {
  const { result } = renderHook(() =>
    useStorageReducer(storageLikeObject, 'key', reducer, {
      value: 0,
    })
  );

  const [state] = result.current;
  expect(state).toStrictEqual({ value: 0 });
});

it('returns default state (lazy initialization)', () => {
  const { result } = renderHook(() =>
    useStorageReducer(storageLikeObject, 'key', reducer, 0, value => ({
      value,
    }))
  );

  const [state] = result.current;
  expect(state).toStrictEqual({ value: 0 });
});
