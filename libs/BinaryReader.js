class BinaryReader {
    constructor(buf, isBig = true, encoding = 'ascii') {
        this.buf        = buf;
        this.isBig      = isBig;
        this.encoding   = encoding;
        this.length     = this.buf.length;
        this.position   = 0;
    }

    setPosition(position) {
        this.position = position;
    }

    Read(byte, func) {
        if(this.buf.length < (this.position + byte)) {
            return 0;
        }

        let value = this.buf[func](this.position);
        this.position += byte;

        return value;
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

    ReadBytes(len) {
        if(len > this.buf.length) {
            return new Buffer(0);
        }

        let value = new Buffer(len);
        this.buf.copy(value, 0, this.position, this.position + len);

        return value;
    }
}

module.exports = BinaryReader;