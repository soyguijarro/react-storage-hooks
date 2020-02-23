function getStorageSpy(storage: Storage, method: 'getItem' | 'setItem') {
  // Cannot mock Storage methods directly: https://github.com/facebook/jest/issues/6798
  return jest.spyOn(Object.getPrototypeOf(storage), method);
}

export function mockStorageError(
  storage: Storage,
  method: 'getItem' | 'setItem',
  errorMessage: string
) {
  getStorageSpy(storage, method).mockImplementation(() => {
    throw new Error(errorMessage);
  });
}

export function mockStorageErrorOnce(
  storage: Storage,
  method: 'getItem' | 'setItem',
  errorMessage: string
) {
  getStorageSpy(storage, method).mockImplementationOnce(() => {
    throw new Error(errorMessage);
  });
}

export function fireStorageEvent(key: string, value: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
}

export const storageLikeObject = {
  getItem: (key: string) => null,
  /* eslint-disable @typescript-eslint/no-empty-function */
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  /* eslint-enable @typescript-eslint/no-empty-function */
};
