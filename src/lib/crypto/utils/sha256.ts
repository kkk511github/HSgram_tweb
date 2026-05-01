import convertToUint8Array from '@helpers/bytes/convertToUint8Array';
import subtle from '@lib/crypto/subtle';
import cryptoSha256 from '@cryptography/sha256';
import bytesFromWordss from '@helpers/bytes/bytesFromWordss';

function bytesToBinaryString(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let result = '';

  for(let i = 0; i < bytes.length; i += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return result;
}

export default function sha256(bytes: Parameters<typeof convertToUint8Array>[0]) {
  const uint8Array = convertToUint8Array(bytes);
  if(subtle) {
    return subtle.digest('SHA-256', uint8Array as BufferSource).then((b) => {
      // console.log('legacy', performance.now() - perfS);
      return new Uint8Array(b);
    });
  }

  return bytesFromWordss(cryptoSha256(bytesToBinaryString(uint8Array)));
  /* //console.log('SHA-256 hash start');

  let perfS = performance.now();


  let perfD = performance.now();
  let words = typeof(bytes) === 'string' ? bytes : bytesToWordss(bytes as any);
  let hash = sha256(words);
  console.log('darutkin', performance.now() - perfD);

  //console.log('SHA-256 hash finish', hash, sha256(words, 'hex'));

  return bytesFromWordss(hash); */
}
