export class BinaryReader {
    bytes: Uint8Array;
    offset: number = 0;

    constructor(bytes: ArrayBuffer | Uint8Array) {
        this.bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        this.offset = 0;
    }

    getBuffer(from: number): Uint8Array {
        return this.bytes.slice(from);
    }

    getOffset(): number {
        return this.offset;
    }

    readInt32(): number {
        const v =
            this.bytes[this.offset] |
            (this.bytes[this.offset + 1] << 8) |
            (this.bytes[this.offset + 2] << 16) |
            (this.bytes[this.offset + 3] << 24);
        this.offset += 4;
        return v;
    }

    readInt64(): bigint {
        let v = 0n;
        for (let i = 0; i < 8; i++) {
            v |= BigInt(this.bytes[this.offset + i]) << (8n * BigInt(i));
        }
        this.offset += 8;
        if (v & (1n << 63n)) {
            v = v - (1n << 64n);
        }
        return v;
    }

    readUInt32(): number {
        const v =
            (this.bytes[this.offset]) |
            (this.bytes[this.offset + 1] << 8) |
            (this.bytes[this.offset + 2] << 16) |
            (this.bytes[this.offset + 3] << 24);
        this.offset += 4;
        return v >>> 0;
    }

    readUInt64(): bigint {
        let result = 0n;
        for (let i = 0; i < 8; i++) {
            result |= BigInt(this.bytes[this.offset + i]) << (8n * BigInt(i));
        }
        this.offset += 8;
        return result;
    }

    readSingle(): number {
        const view = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 4);
        const v = view.getFloat32(0, true);
        this.offset += 4;
        return v;
    }

    readByte(): number {
        return this.bytes[this.offset++];
    }

    readBoolean(): boolean {
        return this.readByte() !== 0;
    }

    readString(): string {
        let length = 0;
        let shift = 0;
        let b: number;
        do {
            b = this.readByte();
            length |= (b & 0x7f) << shift;
            shift += 7;
        } while (b & 0x80);

        const strBytes = this.bytes.slice(this.offset, this.offset + length);
        this.offset += length;
        return new TextDecoder('utf-8').decode(strBytes);
    }

    readRGB(): [number, number, number] {
        const r = this.readByte();
        const g = this.readByte();
        const b = this.readByte();
        return [r, g, b];
    }

    readByteBits(): number[] {
        const byte = this.readByte();
        return [
            byte & 128,
            byte & 64,
            byte & 32,
            byte & 16,
            byte & 8,
            byte & 4,
            byte & 2,
            byte & 1
        ];
    }
}
