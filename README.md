# react-storage-hooks

[![Version](https://img.shields.io/npm/v/react-storage-hooks.svg)](https://www.npmjs.com/package/react-storage-hooks)
![Dependencies](https://img.shields.io/david/soyguijarro/react-storage-hooks.svg)
![Dev dependencies](https://img.shields.io/david/dev/soyguijarro/react-storage-hooks.svg)
[![Build status](https://travis-ci.com/soyguijarro/react-storage-hooks.svg?branch=master)](https://travis-ci.com/soyguijarro/react-storage-hooks)
[![Test coverage](https://codecov.io/gh/soyguijarro/react-storage-hooks/branch/master/graph/badge.svg)](https://codecov.io/gh/soyguijarro/react-storage-hooks)
![Bundle size](https://img.shields.io/bundlephobia/minzip/react-storage-hooks.svg)
[![MIT licensed](https://img.shields.io/github/license/soyguijarro/react-storage-hooks.svg)](https://github.com/soyguijarro/react-storage-hooks/blob/master/LICENSE)

Custom [React hooks](https://reactjs.org/docs/hooks-intro) for keeping application state in sync with `localStorage` or `sessionStorage`.

:book: **Familiar API**. You already know how to use this library! Replace [`useState`](https://reactjs.org/docs/hooks-reference.html#usestate) and [`useReducer`](https://reactjs.org/docs/hooks-reference.html#usereducer) hooks with the ones in this library and get persistent state for free.

:sparkles: **Fully featured**. Automatically stringifies and parses values coming and going to storage, keeps state in sync between tabs by listening to [storage events](https://developer.mozilla.org/docs/Web/API/StorageEvent) and handles non-straightforward use cases correctly.

:zap: **Tiny and fast**. Less than 700 bytes gzipped, enforced with [`size-limit`](https://github.com/ai/size-limit). No external dependencies. Only reads from storage when necessary and writes to storage after rendering.

:capital_abcd: **Completely typed**. Written in TypeScript. Type definitions included and verified with [`tsd`](https://github.com/SamVerschueren/tsd).

:muscle: **Backed by tests**. Full coverage of the API.

## Requirements

You need to use [version 16.8.0](https://github.com/facebook/react/blob/master/CHANGELOG.md#1680-february-6-2019) or greater of React, since that's the first one to include hooks. If you still need to create your application, [Create React App](https://create-react-app.dev/) is the officially supported way.

## Installation

Add the package to your React project:

    npm install --save react-storage-hooks

Or with yarn:

    yarn add react-storage-hooks

## Usage

The `useStorageState` and `useStorageReducer` hooks included in this library work like [`useState`](https://reactjs.org/docs/hooks-reference.html#usestate) and [`useReducer`](https://reactjs.org/docs/hooks-reference.html#usereducer). The only but important differences are:

- Two additional mandatory parameters: [**`Storage` object**](https://developer.mozilla.org/en-US/docs/Web/API/Storage) (`localStorage` or `sessionStorage`) and **storage key**.
- Initial state parameters only apply if there's no data in storage for the provided key. Otherwise data from storage will be used as initial state. Think about it as **default** or **fallback state**.
- The array returned by hooks has an extra last item for **write errors**. It is initially `undefined`, and will be updated with [`Error` objects](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error) thrown by `Storage.setItem`. However the hook will keep updating state even if new values fail to be written to storage, to ensure that your application doesn't break.

### `useStorageState`

#### Example

```javascript
import React from 'react';
import { useStorageState } from 'react-storage-hooks';

function StateCounter() {
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
```

#### Signature

```typescript
function useStorageState<S>(
  storage: Storage,
  key: string,
  defaultState?: S | (() => S)
): [S, React.Dispatch<React.SetStateAction<S>>, Error | undefined];
```

### `useStorageReducer`

#### Example

```javascript
import React from 'react';
import { useStorageReducer } from 'react-storage-hooks';

function reducer(state, action) {
  switch (action.type) {
    case 'inc':
      return { count: state.count + 1 };
    case 'dec':
      return { count: state.count - 1 };
    default:
      return state;
  }
}

function ReducerCounter() {
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
```

#### Signature

```typescript
function useStorageReducer<S, A>(
  storage: Storage,
  key: string,
  reducer: React.Reducer<S, A>,
  defaultState: S
): [S, React.Dispatch<A>, Error | undefined];

function useStorageReducer<S, A, I>(
  storage: Storage,
  key: string,
  reducer: React.Reducer<S, A>,
  defaultInitialArg: I,
  defaultInit: (defaultInitialArg: I) => S
): [S, React.Dispatch<A>, Error | undefined];
```

## Advanced usage

### Alternative storage objects

The `storage` parameter of the hooks can be any object that implements the `getItem`, `setItem` and `removeItem` methods of the [`Storage` interface](https://developer.mozilla.org/en-US/docs/Web/API/Storage). Keep in mind that storage values will be automatically [serialized](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) and [parsed](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) before and after calling these methods.

```typescript
interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```

### Server-side rendering (SSR)

This library checks for the existence of the `window` object and even has some [tests in a node-like environment](https://jestjs.io/docs/en/configuration#testenvironment-string). However in your server code you will need to provide a storage object to the hooks that works server-side. A simple solution is to use a dummy object like this:

```javascript
const dummyStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
```

The important bit here is to have the `getItem` method return `null`, so that the default state parameters of the hooks get applied as initial state.

### Convenience custom hook

If you're using a few hooks in your application with the same type of storage, it might bother you to have to specify the storage object all the time. To alleviate this, you can write a custom hook like this:

```javascript
import { useStorageState } from 'react-storage-hooks';

export function useLocalStorageState(...args) {
  return useStorageState(localStorage, ...args);
}
```

And then use it in your components:

```javascript
import { useLocalStorageState } from './my-hooks';

function Counter() {
  const [count, setCount] = useLocalStorageState('counter', 0);

  // Rest of the component
}
```

## Development

Install development dependencies:

    npm install

To set up the examples:

    npm run examples:setup

To start a server with the examples in watch mode (reloads whenever examples or library code change):

    npm run examples:watch

### Tests

Run tests:

    npm test

Run tests in watch mode:

    npm run test:watch

See code coverage information:

    npm run test:coverage

### Publish

Go to the `master` branch:

    git checkout master

Bump the version number:

    npm version [major | minor | patch]

Run the release script:

    npm run release

All code quality checks will run, the tagged commit generated by `npm version` will be pushed and [Travis CI](https://travis-ci.com/github/soyguijarro/react-storage-hooks) will publish the new package version to the npm registry.

## License

This library is [MIT licensed](LICENSE).
