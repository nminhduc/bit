import zlib from 'zlib';

import toBase64 from './string/to-base64';

module.exports = function packCmd(obj, base64 = true, compress = true) {
  if (compress) {
    if (obj.payload) {
      obj.payload = zlib.deflateSync(JSON.stringify(obj.payload));
    }

    if (obj.headers && obj.headers.context) {
      obj.headers.context = zlib.deflateSync(JSON.stringify(obj.headers.context));
    }
  }

  if (base64) {
    const res = toBase64(JSON.stringify(obj));
    return res;
  }
  return JSON.stringify(obj);
};
