import qrcode from "qrcode-generator";
import { deflateSync } from "zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;

  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }

  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;

  for (let b of bytes) {
    c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  let length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  let body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  let crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, crc]);
}

/**
 * A QR code as a grayscale PNG. Mail clients do not render svg or data urls,
 * so ticket emails and the order page both link to this.
 */
export function qrPng(text: string, scale: number = 10, margin: number = 4): Buffer {
  let qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();

  let modules = qr.getModuleCount();
  let size = (modules + margin * 2) * scale;
  let rows = Buffer.alloc((size + 1) * size, 255);

  for (let y = 0; y < size; y++) {
    rows[y * (size + 1)] = 0;

    let my = Math.floor(y / scale) - margin;

    for (let x = 0; x < size; x++) {
      let mx = Math.floor(x / scale) - margin;
      let dark = my >= 0 && my < modules && mx >= 0 && mx < modules && qr.isDark(my, mx);

      if (dark) {
        rows[y * (size + 1) + 1 + x] = 0;
      }
    }
  }

  let header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
