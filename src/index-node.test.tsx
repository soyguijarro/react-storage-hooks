/**
 * @jest-environment node
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup } from 'react-testing-library';
import {
  createCounterComponentWithState,
  createCounterComponentWithReducer,
} from './test-components';
import {
  useLocalStorageState,
  useLocalStorageReducer,
  useSessionStorageState,
  useSessionStorageReducer,
} from './index';

afterEach(() => {
  cleanup();
});

const SOME_STORAGE_KEY = 'count';

describe('Node environment', () => {
  [
    {
      component: createCounterComponentWithState(useLocalStorageState),
      hookName: 'useLocalStorageState',
    },
    {
      component: createCounterComponentWithState(useSessionStorageState),
      hookName: 'useSessionStorageState',
    },
  ].forEach(({ component: Component, hookName }) => {
    describe(hookName, () => {
      test('uses default state', () => {
        const html = renderToStaticMarkup(
          <Component
            storageKey={SOME_STORAGE_KEY}
            defaultState={{ count: 5 }}
          />
        );

        expect(html.includes('5')).toBe(true);
      });

      test('uses return of default state function as initial state if empty storage (lazy initialization)', () => {
        const html = renderToStaticMarkup(
          <Component
            storageKey={SOME_STORAGE_KEY}
            defaultState={() => ({ count: 5 })}
          />
        );

        expect(html.includes('5')).toBe(true);
      });
    });
  });

  [
    {
      component: createCounterComponentWithReducer(useLocalStorageReducer),
      hookName: 'useLocalStorageReducer',
    },
    {
      component: createCounterComponentWithReducer(useSessionStorageReducer),
      hookName: 'useSessionStorageReducer',
    },
  ].forEach(({ hookName, component: Component }) => {
    describe(hookName, () => {
      test('uses initial state', () => {
        const html = renderToStaticMarkup(
          <Component
            storageKey={SOME_STORAGE_KEY}
            initializerArg={{ count: 5 }}
          />
        );

        expect(html.includes('5')).toBe(true);
      });

      test('applies initializer to initial state (lazy initialization)', () => {
        const html = renderToStaticMarkup(
          <Component
            storageKey={SOME_STORAGE_KEY}
            initializerArg={{ count: 5 }}
            initializer={({ count }) => ({ count: count + 10 })}
          />
        );

        expect(html.includes('15')).toBe(true);
      });
    });
  });
});
