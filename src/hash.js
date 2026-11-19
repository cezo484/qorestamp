// SHA-256 hashing, local only. Nothing here touches the network.

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/** SHA-256 of a Buffer or string, returned as a 0x-prefixed hex string. */
export function sha256Hex(data) {
  return '0x' + createHash('sha256').update(data).digest('hex');
}

/** SHA-256 of a file, read as a stream so large files stay cheap. */
export function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve('0x' + hash.digest('hex')));
  });
}
