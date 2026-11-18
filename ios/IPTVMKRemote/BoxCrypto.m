// BoxCrypto: the AES and SHA-1 the MAG remote protocols need, done by iOS's
// own CommonCrypto (so the app ships no encryption code of its own).
// Data crosses the bridge as base64 strings. Methods are synchronous because
// the protocol code builds each message inline; every call handles a few
// hundred bytes at most.

#import <React/RCTBridgeModule.h>
#import <CommonCrypto/CommonCrypto.h>

@interface BoxCrypto : NSObject <RCTBridgeModule>
@end

@implementation BoxCrypto

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

static NSData *decode(NSString *base64)
{
  return [[NSData alloc] initWithBase64EncodedString:base64 options:0];
}

static id encode(NSData *data)
{
  return data ? [data base64EncodedStringWithOptions:0] : [NSNull null];
}

static NSData *aes(CCOperation op, CCOptions options, NSData *key, NSData *iv, NSData *input)
{
  if (!key || !input || (key.length != 16 && key.length != 24 && key.length != 32)) {
    return nil;
  }
  NSMutableData *output = [NSMutableData dataWithLength:input.length + kCCBlockSizeAES128];
  size_t written = 0;
  CCCryptorStatus status = CCCrypt(op, kCCAlgorithmAES, options, key.bytes, key.length,
                                   iv.length == kCCBlockSizeAES128 ? iv.bytes : NULL,
                                   input.bytes, input.length, output.mutableBytes, output.length,
                                   &written);
  if (status != kCCSuccess) {
    return nil;
  }
  output.length = written;
  return output;
}

// AES-CBC with PKCS#7 padding (AuraHD protocol).
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(cbcEncrypt : (NSString *)key iv : (NSString *)iv data : (NSString *)data)
{
  return encode(aes(kCCEncrypt, kCCOptionPKCS7Padding, decode(key), decode(iv), decode(data)));
}

// Returns null when the data doesn't decrypt (for example a wrong password).
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(cbcDecrypt : (NSString *)key iv : (NSString *)iv data : (NSString *)data)
{
  return encode(aes(kCCDecrypt, kCCOptionPKCS7Padding, decode(key), decode(iv), decode(data)));
}

// One raw AES block, no padding (MAGic Remote builds CFB mode on top of this).
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(ecbEncryptBlock : (NSString *)key block : (NSString *)block)
{
  NSData *input = decode(block);
  if (input.length != kCCBlockSizeAES128) {
    return [NSNull null];
  }
  return encode(aes(kCCEncrypt, kCCOptionECBMode, decode(key), nil, input));
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(sha1 : (NSString *)data)
{
  NSData *input = decode(data);
  if (!input) {
    return [NSNull null];
  }
  unsigned char digest[CC_SHA1_DIGEST_LENGTH];
  CC_SHA1(input.bytes, (CC_LONG)input.length, digest);
  return encode([NSData dataWithBytes:digest length:CC_SHA1_DIGEST_LENGTH]);
}

@end
