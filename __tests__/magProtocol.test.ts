/**
 * Byte-for-byte checks of the MAG remote protocol against vectors generated
 * with the reference Python implementation (rgerganov/magic-remote) using
 * dev_id "0123456789abcdef", dev_descr "IPTV MK Remote" and pairing code "259518".
 */
import {
  MAGProtocolCommand,
  buildMessage,
  connectRequest,
  decrypt,
  decryptReply,
  deriveKey,
  encrypt,
  isValidPairingCode,
  keyboardChar,
  pairingComplete,
  pairingRequest,
  ping,
  rcCode,
  splitFrames,
  utf8DecodeStrict,
  utf8Encode,
} from '../src/services/magProtocol';

const ID = { devId: '0123456789abcdef', devDescr: 'IPTV MK Remote' };
const CODE = '259518';

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => Uint8Array.from(h.match(/../g)!.map(b => parseInt(b, 16)));

const VECTORS = {
  key: '0c449ae2300096245de1447dc8ab893b',
  pairingRequest:
    '00000001600070616972696e672d72657170616972696e672d72657170616972696e672d72657b226465765f6964223a2230313233343536373839616263646566222c226465765f6465736372223a2249505456204d4b2052656d6f7465227d',
  pairingComplete:
    '00000001600070616972696e672d636f6d706c6574652d72657170616972696e672d636f6d70100d74c2ed52ab5beb092a49c5ee4f648b45f794b0db5c4d2a0f88dcc3e3f0fbb8ecd6f5764e2a20a222939fa23cb14b8b9afb6773d8d253a8f7',
  connectRequest:
    '000000016000636f6e6e6563742d726571636f6e6e6563742d726571636f6e6e6563742d72657b226465765f6964223a2230313233343536373839616263646566222c226465765f6465736372223a2249505456204d4b2052656d6f7465227d',
  ping: '00000001430070696e672d72657170696e672d72657170696e672d72657170696e672d726571100d74c2ed52ab5beb092a49c5ee4f648b45f794b0db5c4d2a0f88dc92',
  rcUp: '000000016e0072632d636f64652d72657172632d636f64652d72657172632d636f64652d7265100d74c2ed52ab5beb092a49c5ee4f648b45f794b0db5c4d2a0f88dcc3e3f0fbb8ecd6f5764e2a20a222939fa23cb14b8b9afb6773d8d253a8a62a6f9e03ecfe5a07aa7c53b49224',
  charA:
    '0000000185006d73672d72632d6b622d6b65792d7265716d73672d72632d6b622d6b65796d73100d74c2ed52ab5beb092a49c5ee4f648b45f794b0db5c4d2a0f88dcc3e3f0fbb8ecd6f5764e2a20a222939fa23cb14b8b9afb6773d8d253a8a62a769f03e4f4a41f41bbcaaf40fa1ca5dfec5d53d22b5976a93bfe4b789f4aa3a62728f163',
  encrypt37: '6b2e12a49f08c438c13a0272f8d1725f21af80fd1c856778481e0b1983a274049b4c569fb8',
};

describe('MAG protocol: matches reference implementation', () => {
  it('derives the AES key', () => {
    expect(hex(deriveKey(CODE))).toBe(VECTORS.key);
  });

  it('encrypts a non-block-aligned buffer (AES-CFB)', () => {
    const plain = Uint8Array.from({ length: 37 }, (_, i) => i);
    expect(hex(encrypt(CODE, plain))).toBe(VECTORS.encrypt37);
    expect(Array.from(decrypt(CODE, encrypt(CODE, plain)))).toEqual(Array.from(plain));
  });

  it('builds every message type identically', () => {
    expect(hex(pairingRequest(ID))).toBe(VECTORS.pairingRequest);
    expect(hex(pairingComplete(ID, CODE))).toBe(VECTORS.pairingComplete);
    expect(hex(connectRequest(ID))).toBe(VECTORS.connectRequest);
    expect(hex(ping(ID, CODE))).toBe(VECTORS.ping);
    expect(hex(rcCode(ID, CODE, 189))).toBe(VECTORS.rcUp);
    expect(hex(keyboardChar(ID, CODE, 'a'))).toBe(VECTORS.charA);
  });
});

describe('MAG protocol: framing and replies', () => {
  it('all commands are exactly 32 characters', () => {
    Object.values(MAGProtocolCommand).forEach(cmd => expect(cmd).toHaveLength(32));
  });

  it('splits concatenated frames and keeps partial data', () => {
    const a = ping(ID, CODE);
    const b = rcCode(ID, CODE, 172);
    const joined = new Uint8Array(a.length + b.length);
    joined.set(a);
    joined.set(b, a.length);

    const partial = joined.slice(0, joined.length - 5);
    const first = splitFrames(partial);
    expect(first.frames).toHaveLength(1);
    expect(first.frames[0].command).toBe(MAGProtocolCommand.PING);
    expect(first.rest.length).toBe(b.length - 5);

    const all = splitFrames(joined);
    expect(all.frames.map(f => f.command)).toEqual([
      MAGProtocolCommand.PING,
      MAGProtocolCommand.RC_CODE,
    ]);
    expect(all.rest.length).toBe(0);
  });

  it('decrypts a reply with the right code and rejects a wrong code', () => {
    const reply = fromHex(VECTORS.ping);
    const { frames } = splitFrames(reply);
    expect(decryptReply(CODE, frames[0].body)).toBe('{"dev_id":"0123456789abcdef"}');
    expect(decryptReply('000000', frames[0].body)).toBeNull();
  });

  it('round-trips UTF-8 and rejects invalid sequences', () => {
    const text = 'Ελληνικά ✓ 😀';
    expect(utf8DecodeStrict(utf8Encode(text))).toBe(text);
    expect(utf8DecodeStrict(Uint8Array.from([0xc3]))).toBeNull();
    expect(utf8DecodeStrict(Uint8Array.from([0xff, 0x41]))).toBeNull();
  });

  it('validates pairing codes and message length', () => {
    expect(isValidPairingCode('259518')).toBe(true);
    expect(isValidPairingCode('25951')).toBe(false);
    expect(isValidPairingCode('25951a')).toBe(false);
    expect(() => buildMessage('short', '{}')).toThrow();
    expect(() => buildMessage(MAGProtocolCommand.PING, 'x'.repeat(300))).toThrow();
  });
});
