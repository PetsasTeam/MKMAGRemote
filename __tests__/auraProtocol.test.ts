/// <reference types="node" />
/**
 * AuraHD protocol: encryption (checked against Node's own AES), message
 * formats, the button table and discovery parsing.
 */
import crypto from 'crypto';
import {
  auraDecrypt,
  auraEncrypt,
  auraKey,
  buttonMessages,
  charKeycode,
  charMessages,
  isAuraCommandSupported,
  isPingResponse,
  parseInfo,
  pingRequest,
  solicitMessage,
} from '../src/services/auraProtocol';
import { MAGCommand } from '../src/types';

const PASSWORD = '987654';
const IV = Buffer.from('erghnlhbnmbnkghy');

function nodeKey(password: string): Buffer {
  const key = Buffer.alloc(32);
  Buffer.from(password, 'utf8').copy(key);
  return key;
}
const nodeEncrypt = (password: string, text: string) => {
  const c = crypto.createCipheriv('aes-256-cbc', nodeKey(password), IV);
  return Buffer.concat([c.update(text, 'utf8'), c.final()]);
};
const nodeDecrypt = (password: string, data: Uint8Array) => {
  const d = crypto.createDecipheriv('aes-256-cbc', nodeKey(password), IV);
  return Buffer.concat([d.update(Buffer.from(data)), d.final()]).toString('utf8');
};

describe('AuraHD encryption', () => {
  it('pads the password with zeros to a 32-byte key', () => {
    const key = auraKey('1357');
    expect(key).toHaveLength(32);
    expect(Array.from(key.slice(0, 5))).toEqual([0x31, 0x33, 0x35, 0x37, 0]);
    expect(auraKey('')).toEqual(new Uint8Array(32));
  });

  it('encrypts exactly like AES-256-CBC with the fixed IV', () => {
    for (const text of ['{"msgType":"pingRequest"}', 'x', 'a'.repeat(16), 'ünïcode ✓']) {
      expect(Buffer.from(auraEncrypt(PASSWORD, text))).toEqual(nodeEncrypt(PASSWORD, text));
    }
  });

  it('decrypts what Node encrypts, and rejects the wrong password', () => {
    const data = nodeEncrypt(PASSWORD, '{"msgType":"pingResponse"}');
    expect(auraDecrypt(PASSWORD, data)).toBe('{"msgType":"pingResponse"}');
    expect(auraDecrypt('111111', data)).toBeNull();
    expect(auraDecrypt(PASSWORD, new Uint8Array(5))).toBeNull();
  });

  it('recognises the box ping reply', () => {
    expect(nodeDecrypt(PASSWORD, pingRequest(PASSWORD))).toBe('{"msgType":"pingRequest"}');
    expect(isPingResponse(PASSWORD, nodeEncrypt(PASSWORD, '{"msgType":"pingResponse"}'))).toBe(
      true,
    );
    // The iOS AuraHD app pretty-prints its JSON; the box's replies may too.
    expect(
      isPingResponse(PASSWORD, nodeEncrypt(PASSWORD, '{\n  "msgType" : "pingResponse"\n}')),
    ).toBe(true);
    expect(isPingResponse('000000', nodeEncrypt(PASSWORD, '{"msgType":"pingResponse"}'))).toBe(
      false,
    );
  });
});

describe('AuraHD buttons', () => {
  it('sends a press then a release with the Qt key event', () => {
    const [press, release] = buttonMessages(PASSWORD, MAGCommand.OK).map(m =>
      JSON.parse(nodeDecrypt(PASSWORD, m)),
    );
    expect(press).toEqual({
      msgType: 'keyboardKey',
      action: 'press',
      keycode: 16777220,
      unicode: 13,
      metaState: 0,
      characters: '',
    });
    expect(release).toEqual({ ...press, action: 'release' });
  });

  it('uses the Alt / Control modifiers the box expects', () => {
    const info = JSON.parse(nodeDecrypt(PASSWORD, buttonMessages(PASSWORD, MAGCommand.INFO)[0]));
    expect(info).toMatchObject({ keycode: 89, metaState: 134217728 });
    const red = JSON.parse(nodeDecrypt(PASSWORD, buttonMessages(PASSWORD, MAGCommand.RED)[0]));
    expect(red).toMatchObject({ keycode: 16777264, metaState: 67108864 });
  });

  it('only supports buttons it has a key for', () => {
    expect(isAuraCommandSupported(MAGCommand.UP)).toBe(true);
    expect(isAuraCommandSupported(MAGCommand.NUM_7)).toBe(true);
    expect(isAuraCommandSupported(MAGCommand.POWER)).toBe(false);
    expect(buttonMessages(PASSWORD, MAGCommand.POWER)).toEqual([]);
  });

  it('types characters with the right keycodes', () => {
    expect(charKeycode('a')).toBe(65);
    expect(charKeycode('Z')).toBe(90);
    expect(charKeycode('7')).toBe(55);
    expect(charKeycode(' ')).toBe(32);
    expect(charKeycode('é')).toBe(0);
    const [press] = charMessages(PASSWORD, 'q').map(m => JSON.parse(nodeDecrypt(PASSWORD, m)));
    expect(press).toMatchObject({ action: 'press', keycode: 81, unicode: 113, metaState: 0 });
    // Like the AuraHD app, typed characters carry no "characters" field.
    expect(press).not.toHaveProperty('characters');
  });
});

describe('AuraHD discovery', () => {
  it('asks the box to reply to our port', () => {
    expect(JSON.parse(Buffer.from(solicitMessage(51234)).toString())).toEqual({
      protocol: 'remote_stb_1.0',
      port: 51234,
    });
  });

  it('parses the box info reply', () => {
    const reply = Buffer.from(
      JSON.stringify({
        msgType: 'Info',
        name: 'Living room',
        deviceFamily: 'stbapp',
        type: 'MAG424',
        serialNumber: 'SN123',
        screenHeight: 1080,
        screenWidth: 1920,
        port: 7666,
        protocolVersion: '1.0',
        modes: ['MOUSE', 'KEYBOARD'],
      }),
    );
    expect(parseInfo(reply)).toEqual({
      name: 'Living room',
      type: 'MAG424',
      serialNumber: 'SN123',
      port: 7666,
      screenWidth: 1920,
      screenHeight: 1080,
    });
  });

  it('ignores anything that is not an info reply', () => {
    expect(parseInfo(Buffer.from('{"msgType":"pingResponse"}'))).toBeNull();
    expect(parseInfo(Buffer.from('not json'))).toBeNull();
    expect(parseInfo(new Uint8Array([0xff, 0xfe]))).toBeNull();
    expect(parseInfo(Buffer.from('{"msgType":"Info","port":"abc"}'))?.port).toBe(7666);
  });
});
