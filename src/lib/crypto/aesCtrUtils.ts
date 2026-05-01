/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import SubtleCTR from '@lib/crypto/utils/aesCTR';
import JsCTR from '@lib/crypto/utils/aesCTRJs';
import subtle from '@lib/crypto/subtle';

const aesCTRs: Map<number, K> = new Map();
let lastCTRId = -1;

type K = {
  enc: SubtleCTR | JsCTR,
  dec: SubtleCTR | JsCTR,
};

export async function aesCtrPrepare({encKey, encIv, decKey, decIv}: {[k in 'encKey' | 'encIv' | 'decKey' | 'decIv']: Uint8Array}) {
  const id = ++lastCTRId;

  let enc: K['enc'], dec: K['dec'];
  if(subtle) {
    const a = [['encrypt', encKey], ['decrypt', decKey]] as ['encrypt' | 'decrypt', Uint8Array][];
    const promises = a.map(([mode, key]) => {
      return subtle.importKey(
        'raw',
        key as BufferSource,
        {name: 'AES-CTR'},
        false,
        [mode]
      )
    });

    const [encCryptoKey, decCryptoKey] = await Promise.all(promises);
    enc = new SubtleCTR('encrypt', encCryptoKey, encIv.slice());
    dec = new SubtleCTR('decrypt', decCryptoKey, decIv.slice());
  } else {
    enc = new JsCTR(encKey, encIv.slice(), undefined as unknown as CryptoKey);
    dec = new JsCTR(decKey, decIv.slice(), undefined as unknown as CryptoKey);
  }

  const k: K = {
    enc,
    dec
  };

  aesCTRs.set(id, k);

  return id;
}

export async function aesCtrProcess({id, data, operation}: {id: number, data: Uint8Array, operation: 'encrypt' | 'decrypt'}) {
  const ctrs = aesCTRs.get(id);
  const result = await (operation === 'encrypt' ? ctrs.enc : ctrs.dec).update(data);
  return result;
}

export function aesCtrDestroy(id: number) {
  aesCTRs.delete(id);
}
