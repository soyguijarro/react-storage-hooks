# React storage hooks

[![Version](https://img.shields.io/npm/v/react-storage-hooks.svg)](https://www.npmjs.com/package/react-storage-hooks)
![Dependencies](https://img.shields.io/david/soyguijarro/react-storage-hooks.svg)
![Dev dependencies](https://img.shields.io/david/dev/soyguijarro/react-storage-hooks.svg)
[![Build status](https://travis-ci.com/soyguijarro/react-storage-hooks.svg?branch=master)](https://travis-ci.com/soyguijarro/react-storage-hooks)
[![Test coverage](https://codecov.io/gh/soyguijarro/react-storage-hooks/branch/master/graph/badge.svg)](https://codecov.io/gh/soyguijarro/react-storage-hooks)
![Bundle size](https://img.shields.io/bundlephobia/minzip/react-storage-hooks.svg)
[![MIT licensed](https://img.shields.io/github/license/soyguijarro/react-storage-hooks.svg)](https://github.com/soyguijarro/react-storage-hooks/blob/master/LICENSE)

Custom [React hooks](https://reactjs.org/docs/hooks-intro) for keeping application state in sync with [`localStorage`](https://developer.mozilla.org/docs/Web/API/Window/localStorage) and [`sessionStorage`](https://developer.mozilla.org/docs/Web/API/Window/sessionStorage).

:book: **Familiar API**. You already know how to use this library! Replace the [`useState`](https://reactjs.org/docs/hooks-reference.html#usestate) and [`useReducer`](https://reactjs.org/docs/hooks-reference.html#usereducer) hooks with the ones in this library and get persistent state for free.

:sparkles: **Fully featured**. Automatically stringifies and parses values coming and going to storage, keeps state in sync between tabs by listening to [storage events](https://developer.mozilla.org/docs/Web/API/StorageEvent) and handles non-straightforward use cases correctly. Also supports server-side rendering. Expect it to **just work**.

:zap: **Tiny and fast**. Less than 1kb gzipped. No external dependencies. Only reads from storage when necessary and always updates application state before writing.

:capital_abcd: **Completely typed**. Written in TypeScript. Type definitions included.

:muscle: **Backed by tests**. Full coverage of the whole API.

## Installation

Since this library provides custom React hooks, you need a working React environment. I recommend the official [Create React App](https://facebook.github.io/create-react-app/).

Add the library to your project with npm:

```
npm install --save react-storage-hooks
```

Or with yarn:

```
yarn add react-storage-hooks
```

And import the hooks to use them:

```javascript
import {
  useLocalStorageState,
  useLocalStorageReducer,
  useSessionStorageState,
  useSessionStorageReducer,
} from 'react-storage-hooks';
```

## Usage

Four hooks are included:

- For `localStorage`: `useLocalStorageState` and `useLocalStorageReducer`.
- For `sessionStorage`: `useSessionStorageState` and `useSessionStorageReducer`.

They mirror the API of React's built-in [`useState`](https://reactjs.org/docs/hooks-reference.html#usestate) and [`useReducer`](https://reactjs.org/docs/hooks-reference.html#usereducer) hooks. Please **read their docs** to learn how to use them, and don't hesitate to [file an issue](https://github.com/soyguijarro/react-storage-hooks/issues) if you happen to find diverging behavior.

The **only but important differences** are:

- You need to provide a **storage key** as an additional **first parameter**. This is mandatory.
- The initial state parameter only applies if there's no data in storage for the provided key. Otherwise the storage data will be used. Think of it as a **default state**.
- The array returned by the hooks has an extra last item for **write errors**. It is initially `undefined`, and will be updated with [`Error` objects](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error) thrown by `Storage.setItem`. However **the hook will keep updating state** even if new values fail to be written to storage, to ensure that your application doesn't break.

### `useLocalStorageState` and `useSessionStorageState`

[`useState`](https://reactjs.org/docs/hooks-reference.html#usestate) hooks with `localStorage` or `sessionStorage` persistence.

```javascript
const [state, setState, writeError] = useLocalStorageState(key, defaultState?);
const [state, setState, writeError] = useSessionStorageState(key, defaultState?);
```

#### Example

```javascript
import React from 'react';
import { useLocalStorageState } from 'react-storage-hooks';

const Counter = () => {
  const [count, setCount, writeError] = useLocalStorageState('counter', 0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(0)}>Reset</button>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
      {writeError && (
        <pre>Cannot write to localStorage: {writeError.message}</pre>
      )}
    </div>
  );
};
```

### `useLocalStorageReducer` and `useSessionStorageReducer`

[`useReducer`](https://reactjs.org/docs/hooks-reference.html#usereducer) hooks with `localStorage` or `sessionStorage` persistence.

```javascript
const [state, dispatch, writeError] = useLocalStorageReducer(
  key,
  reducer,
  initializerArg,
  initializer?
);
const [state, dispatch, writeError] = useSessionStorageReducer(
  key,
  reducer,
  initializerArg,
  initializer?
);
```

#### Example

```javascript
import React from 'react';
import { useLocalStorageReducer } from 'react-storage-hooks';

const initialCount = 0;

const reducer = (state, action) => {
  switch (action.type) {
    case 'reset':
      return { count: initialCount };
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    default:
      return state;
  }
};

const Counter = () => {
  const [state, dispatch, writeError] = useLocalStorageReducer(
    'counter',
    reducer,
    {
      count: initialCount,
    }
  );

  return (
    <div>
      <p>You clicked {state.count} times</p>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      {writeError && (
        <pre>Cannot write to localStorage: {writeError.message}</pre>
      )}
    </div>
  );
};
```
