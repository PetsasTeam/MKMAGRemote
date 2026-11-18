// Minimal React Native stand-in for the Node test runner (no native modules).
// BoxCrypto mirrors ios/IPTVMKRemote/BoxCrypto.m using Node's crypto.
const crypto = require('crypto');

const b = s => Buffer.from(s, 'base64');
const aesName = key => `aes-${key.length * 8}`;

const BoxCrypto = {
  cbcEncrypt(key, iv, data) {
    const c = crypto.createCipheriv(`${aesName(b(key))}-cbc`, b(key), b(iv));
    return Buffer.concat([c.update(b(data)), c.final()]).toString('base64');
  },
  cbcDecrypt(key, iv, data) {
    try {
      const d = crypto.createDecipheriv(`${aesName(b(key))}-cbc`, b(key), b(iv));
      return Buffer.concat([d.update(b(data)), d.final()]).toString('base64');
    } catch {
      return null;
    }
  },
  ecbEncryptBlock(key, block) {
    const c = crypto.createCipheriv(`${aesName(b(key))}-ecb`, b(key), null);
    c.setAutoPadding(false);
    return Buffer.concat([c.update(b(block)), c.final()]).toString('base64');
  },
  sha1(data) {
    return crypto.createHash('sha1').update(b(data)).digest('base64');
  },
};

module.exports = {
  NativeModules: { BoxCrypto },
  Platform: { OS: 'ios', select: options => options.ios ?? options.default },
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  NativeEventEmitter: class {
    addListener() {
      return { remove() {} };
    }
  },
};
