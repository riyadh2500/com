// Stub for @react-native-async-storage/async-storage
// MetaMask SDK imports this but it doesn't exist in the browser.
// We provide a localStorage-backed shim so the SDK doesn't crash.

const AsyncStorage = {
  getItem: (key) => Promise.resolve(
    typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
  ),
  setItem: (key, value) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return Promise.resolve();
  },
  clear: () => {
    if (typeof window !== 'undefined') window.localStorage.clear();
    return Promise.resolve();
  },
  getAllKeys: () => Promise.resolve(
    typeof window !== 'undefined' ? Object.keys(window.localStorage) : []
  ),
  multiGet: (keys) => Promise.resolve(
    keys.map((k) => [k, typeof window !== 'undefined' ? window.localStorage.getItem(k) : null])
  ),
  multiSet: (pairs) => {
    if (typeof window !== 'undefined') {
      pairs.forEach(([k, v]) => window.localStorage.setItem(k, v));
    }
    return Promise.resolve();
  },
  multiRemove: (keys) => {
    if (typeof window !== 'undefined') {
      keys.forEach((k) => window.localStorage.removeItem(k));
    }
    return Promise.resolve();
  },
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
