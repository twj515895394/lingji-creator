import fs from 'node:fs/promises';
import path from 'node:path';

interface ZipEntry {
  name: string;
  data: Buffer;
  crc32: number;
  offset: number;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function encodeName(name: string): Buffer {
  return Buffer.from(name.replace(/\\/g, '/'), 'utf8');
}

async function collectZipEntries(rootDir: string, currentDir = rootDir): Promise<ZipEntry[]> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = entries.sort((left, right) => left.name.localeCompare(right.name));
  const result: ZipEntry[] = [];
  for (const entry of files) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await collectZipEntries(rootDir, absolutePath));
      continue;
    }
    const data = await fs.readFile(absolutePath);
    result.push({
      name: path.relative(rootDir, absolutePath).split(path.sep).join('/'),
      data,
      crc32: crc32(data),
      offset: 0,
    });
  }
  return result;
}

function buildLocalHeader(entry: ZipEntry): Buffer {
  const fileName = encodeName(entry.name);
  const header = Buffer.alloc(30 + fileName.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(entry.crc32, 14);
  header.writeUInt32LE(entry.data.length, 18);
  header.writeUInt32LE(entry.data.length, 22);
  header.writeUInt16LE(fileName.length, 26);
  header.writeUInt16LE(0, 28);
  fileName.copy(header, 30);
  return header;
}

function buildCentralDirectoryHeader(entry: ZipEntry): Buffer {
  const fileName = encodeName(entry.name);
  const header = Buffer.alloc(46 + fileName.length);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(entry.crc32, 16);
  header.writeUInt32LE(entry.data.length, 20);
  header.writeUInt32LE(entry.data.length, 24);
  header.writeUInt16LE(fileName.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.offset, 42);
  fileName.copy(header, 46);
  return header;
}

export async function writeZipFromDirectory(sourceDir: string, outputPath: string): Promise<void> {
  const entries = await collectZipEntries(sourceDir);
  const localParts: Buffer[] = [];
  const centralDirectoryParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    entry.offset = offset;
    const localHeader = buildLocalHeader(entry);
    localParts.push(localHeader, entry.data);
    offset += localHeader.length + entry.data.length;
    centralDirectoryParts.push(buildCentralDirectoryHeader(entry));
  }

  const centralDirectory = Buffer.concat(centralDirectoryParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, Buffer.concat([...localParts, centralDirectory, endRecord]));
}
