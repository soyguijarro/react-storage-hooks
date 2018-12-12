# React storage hooks

Custom [React hooks](https://reactjs.org/docs/hooks-intro) for keeping application state in sync with [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

:book: **Similar API to [`useState`](https://reactjs.org/docs/hooks-reference.html#usestate) and [`useReducer`](https://reactjs.org/docs/hooks-reference.html#usereducer)**. You already know how to use this library! Replace the built-in hooks with `useStorageState` and `useStorageReducer` and get persistent state for free.

:sparkles: **Fully featured**. Automatically stringifies and parses values coming and going to storage, keeps state in sync between tabs by listening to [storage events](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent), and generally handles non-straightforward use cases correctly, like dynamically changing the storage key provided. Expect it to **just work**.

:zap: **Fast and reliable**. No external dependencies. Only reads from storage when necessary and always updates application state before writing. Doesn't break if access to `localStorage` fails.

:capital_abcd: **Type definitions** included. Written in TypeScript.

:muscle: Thoroughly backed by **tests**.

## Install

> :warning: **React hooks are still a feature proposal**, currently in React v16.7.0-alpha.

Since this library provides custom React hooks, you need a working React environment. I recommend the official [Create React App](https://facebook.github.io/create-react-app/).

Then, install the library with npm:

```
npm install --save react-storage-hooks
```

Or with yarn:

```
yarn add react-storage-hooks
```

And import the hooks to use them:

```javascript
import { useStorageState, useStorageReducer } from 'react-storage-hooks';
```

## Usage

The library includes two hooks, `useStorageState` and `useStorageReducer`. They mirror the API of React's built-in [`useState`](https://reactjs.org/docs/hooks-reference.html#usestate) and [`useReducer`](https://reactjs.org/docs/hooks-reference.html#usereducer) hooks, respectively. Please **read their docs** to learn how to use them, and don't hesitate to [file an issue](https://github.com/soyguijarro/react-storage-hooks/issues) if you happen to find diverging behavior.

The **only but important differences** are:

- You need to provide a **storage key** as an additional **first parameter**. This is mandatory.
- The initial state parameter is actually a **default state** here. The storage data for the provided key will be used as initial state, and the default state will be used as fallback if the key is empty.
- The array returned by the hooks has an extra last item for **write errors**. It is `undefined` by default and will be updated with [`Error` objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) thrown by `localStorage.setItem`, if there were any. However **the hook will keep working** to ensure your application doesn't break: state will keep updating even if the new values fail to be written to storage.

### `useStorageState`

[`useState`](https://reactjs.org/docs/hooks-reference.html#usestate) hook with `localStorage` persistence.

```javascript
const [state, setState, writeError] = useStorageState(key, defaultState?);
```

#### Example

```javascript
import React from 'react';
import { useStorageState } from 'react-storage-hooks';

const Counter = () => {
  const [count, setCount, writeError] = useStorageState('counter', 0);

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

### `useStorageReducer`

[`useReducer`](https://reactjs.org/docs/hooks-reference.html#usereducer) hook with `localStorage` persistence.

```javascript
const [state, dispatch, writeError] = useStorageReducer(
  key,
  reducer,
  defaultState,
  initialAction?
);
```

#### Example

```javascript
import React from 'react';
import { useStorageReducer } from 'react-storage-hooks';

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
  const [state, dispatch, writeError] = useStorageReducer('counter', reducer, {
    count: initialCount,
  });

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
