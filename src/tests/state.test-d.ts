/* eslint-disable react-hooks/rules-of-hooks */

import { Dispatch, SetStateAction } from 'react';
import { expectType, expectError } from 'tsd';

import { useStorageState } from '..';
import { storageLikeObject } from './utils';

type SetState<S> = Dispatch<SetStateAction<S>>;

const [inferredString, setInferredString, writeError] = useStorageState(
  localStorage,
  'key',
  'test'
);
expectType<string>(inferredString);
expectType<SetState<string>>(setInferredString);
expectType<Error | undefined>(writeError);
expectError(() => setInferredString(0));

const [inferredNumber, setInferredNumber] = useStorageState(
  localStorage,
  'key',
  0
);
expectType<number>(inferredNumber);
expectType<SetState<number>>(setInferredNumber);
expectError(() => setInferredNumber('test'));

const [inferredNumberLazy, setInferredNumberLazy] = useStorageState(
  localStorage,
  'key',
  () => 0
);
expectType<number>(inferredNumberLazy);
expectType<SetState<number>>(setInferredNumberLazy);
expectError(() => setInferredNumberLazy('test'));

const [declaredNumber, setDeclaredNumber] = useStorageState<number>(
  localStorage,
  'key'
);
expectType<number | null>(declaredNumber);
expectType<SetState<number | null>>(setDeclaredNumber);
expectError(() => setDeclaredNumber('test'));

const [unknown, setUnknown] = useStorageState(localStorage, 'key');
expectType<unknown>(unknown);
expectType<SetState<unknown>>(setUnknown);

useStorageState(storageLikeObject, 'key', 0);

expectError(() => useStorageState());
expectError(() => useStorageState(localStorage));

expectError(() => useStorageState({}, 'key'));
expectError(() => useStorageState(localStorage, 0));
