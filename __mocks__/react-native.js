// Minimal React Native stand-in for the Node test runner (no native modules).
module.exports = {
  NativeModules: {},
  Platform: { OS: 'ios', select: options => options.ios ?? options.default },
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  NativeEventEmitter: class {
    addListener() {
      return { remove() {} };
    }
  },
};
