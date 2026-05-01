import convertToUint8Array from '@helpers/bytes/convertToUint8Array';
import subtle from '@lib/crypto/subtle';
import cryptoSha1 from '@cryptography/sha1';
import bytesFromWordss from '@helpers/bytes/bytesFromWordss';

function bytesToBinaryString(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let result = '';

  for(let i = 0; i < bytes.length; i += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return result;
}

export default function sha1(bytes: Parameters<typeof convertToUint8Array>[0]) {
  const uint8Array = convertToUint8Array(bytes);
  if(subtle) {
    return subtle.digest('SHA-1', uint8Array as BufferSource).then((b) => {
      return new Uint8Array(b);
    });
  }

  return bytesFromWordss(cryptoSha1(bytesToBinaryString(uint8Array)));
  /* //console.trace(dT(), 'SHA-1 hash start', bytes);

  const hashBytes: number[] = [];

  let hash = sha1(String.fromCharCode.apply(null,
    bytes instanceof Uint8Array ? [...bytes] : [...new Uint8Array(bytes)]));
  for(let i = 0; i < hash.length; ++i) {
    hashBytes.push(hash.charCodeAt(i));
  }

  //console.log(dT(), 'SHA-1 hash finish', hashBytes, bytesToHex(hashBytes));

  return new Uint8Array(hashBytes); */
}
