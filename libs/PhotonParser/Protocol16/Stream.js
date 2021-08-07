class Stream {
    constructor(length) {
        this.buffer = new Buffer(length);
        this.position = 0;
        this._length = null;

        this.canRead = true;
        this.canSeek = true;
        this.canWrite = true;

        this.isBig = true;
    }

    get length() {
        return this._length == null ? this.buffer.length : this._length;
    }

    setLength(length) {
        if(this.length > length) {
            this._length = length;
        }
    }

    setBuffer(buffer) {
        this.buffer = buffer;
        this._length = null;
    }

    writeBuffer(buffer, offset, length) {
        buffer.copy(this.buffer, 0, offset, offset + length);
        this._length = length;
    }

    getPosition() {
        return this.position;
    }

    setPosition(position) {
        if(this.length > position) {
            this.position = position;
        }
    }

    _Read(buffer, offset, count) {
        const dif = this.length - this.position;
        if(div <= 0) {
            return 0;
        }

        if(count > dif) {
            count = dif;
        }

        // Buffer.BlockCopy(_buffer, _position, buffer, offset, count);

        this.position += count;

        return count;
    }

    Read(byte, func) {
        if(this.length < byte || isNaN(this.position)) {
            return -1;
        }

        let value = this.buffer[func](this.position);
        this.position += byte;

        return value;
    }

    ReadByte() {
        return this.ReadUInt8();
    }

    ReadUInt8() {
        return this.Read(1, 'readUInt8');
    }

    ReadUInt16() {
        return this.Read(2, this.isBig ? 'readUInt16BE' : 'readUInt16LE');
    }

    ReadUInt32() {
        return this.Read(4, this.isBig ? 'readUInt32BE' : 'readUInt32LE');
    }

    ReadInt8() {
        return this.Read(1, 'readInt8');
    }

    ReadInt16() {
        return this.Read(2, this.isBig ? 'readInt16BE' : 'readInt16LE');
    }

    ReadInt32() {
        return this.Read(4, this.isBig ? 'readInt32BE' : 'readInt32LE');
    }

    ReadFloat() {
        return this.Read(4, this.isBig ? 'readFloatBE' : 'readFloatLE');
    }

    ReadDouble() {
        return this.Read(8, this.isBig ? 'readDoubleBE' : 'readDoubleLE');
    }

    ReadLong() {
        if(this.length < 8) {
            return -1;
        }

        const low = this.buffer.readInt32BE(this.position + 4);
        let n = this.buffer.readInt32BE(this.position) * 4294967296.0 + low;

        this.position += 8;

        if(low < 0) {
            n += 4294967296;
        }

        return n;
    }

    ReadString(length) {
        const value = this.buffer.toString('UTF8', this.position, this.position + length);
        this.position += length;

        return value;
    }

    ReadBytes(len) {
        if((this.position + len) > this.length) {
            return new Buffer(0);
        }

        let value = new Buffer(len);
        this.buffer.copy(value, 0, this.position, this.position + len);
        this.position += len;

        return value;
    }
}

module.exports = Stream;