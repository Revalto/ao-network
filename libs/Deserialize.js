/**
 * 2019 (c) Fenrir
 */

module.exports.streamConstructor = (buffer, offset = 0) => {
    return {
        buffer,
        offset,
        ReadByte: function () {
            const offset = this.offset;
            this.offset++;
            return this.buffer.readUInt8(offset);
        },
        readUInt16BE: function () {
            const offset = this.offset;
            this.offset += 2;
            return this.buffer.readUInt16BE(offset);
        },
        readInt32BE: function () {
            const offset = this.offset;
            this.offset += 4;
            return this.buffer.readInt32BE(offset);
        },
        readFloatBE: function () {
            const offset = this.offset;
            this.offset += 4;
            return this.buffer.readFloatBE(offset);
        },
        readDoubleBE: function () {
            const offset = this.offset;
            this.offset += 8;
            return this.buffer.readDoubleBE(offset);
        },
        readLong: function () {
            const offset = this.offset;
            this.offset += 8;
            const low = this.buffer.readInt32BE(offset + 4);
            let n = this.buffer.readInt32BE(offset) * 4294967296.0 + low;
            if (low < 0) n += 4294967296;
            return n;
        },
        readString: function (length) {
            const offset = this.offset;
            this.offset += length;
            return this.buffer.toString('UTF8', offset, offset + length);
        }
    }
}

/** @typedef {typeof stream} Stream */

/** @param {Stream} stream */
const DeserializeByte = (stream) => {
    return stream.ReadByte();
}

/** @param {Stream} stream */
const DeserializeBoolean = (stream) => {
    return stream.ReadByte() > 0;
}

/**
 * @param {Stream} stream 
 */
const DeserializeInteger = (stream) => {
    return stream.readInt32BE();
}

/** @param {Stream} stream  */
const DeserializeShort = (stream) => {
    return stream.readUInt16BE();
}

/** @param {Stream} stream  */
const DeserializeLong = (stream) => {
    return stream.readLong();
}

const MakeArray = length => new Array(length).fill(0);

/**
 * @param {Stream} stream 
 */
const DeserializeByteArray = (stream) => {
    const count = DeserializeInteger(stream);
    return MakeArray(count).map(() => stream.ReadByte());
}

/**
 * @param {Stream} stream 
 */
const DeserializeIntArray = (stream) => {
    const count = DeserializeInteger(stream);
    return MakeArray(count).map(() => stream.readInt32BE());
}

/**
 * @param {Stream} stream 
 */
const DeserializeString = (stream) => {
    const num = DeserializeShort(stream);
    if (!num) return "";
    return stream.readString(num);
}

/**
 * @param {Stream} stream 
 */
const DeserializeFloat = (stream) => {
    return stream.readFloatBE();
}

/**
 * @param {Stream} stream 
 */
const DeserializeStringArray = (stream) => {
    const length = DeserializeShort(stream);
    return MakeArray(length).map(() => DeserializeString(stream));
}

/**
 * @param {Stream} stream 
 */
const DeserializeArray = (stream) => {
    const length = DeserializeShort(stream);
    const type = stream.ReadByte();

    if (!length) {
        return [];
    }


    switch (type) {
        case 120:
            return MakeArray(length).map(() => DeserializeByteArray(stream));
        case 121: // return MakeArray(length).map(() => DeserializeArray(stream));
        case 105: case 108: case 111: case 115: case 102: case 107:
            return MakeArray(length).map(() => Deserialize(stream, type))
        case 68: // DeserializeDictionaryArray
        case 99: // CustomType
        default:
            throw new Error(`Array type not implemented ${type}`)
    }
}

/** @param {Stream} stream */
const DeserializeDictionary = (stream) => {
    const typeCode1 = stream.ReadByte();
    const typeCode2 = stream.ReadByte();
    const num = DeserializeShort(stream);
    const flag1 = typeCode1 == 0 || typeCode1 == 42;
    const flag2 = typeCode2 == 0 || typeCode2 == 42;
    const instance = {};
    // const instance = Activator.CreateInstance(typeof (Dictionary<>).MakeGenericType(this.GetTypeOfCode(typeCode1), this.GetTypeOfCode(typeCode2)));
    for (let index = 0; index < num; ++index) {
        const key = Deserialize(stream, flag1 ? stream.ReadByte() : typeCode1);
        const obj = Deserialize(stream, flag2 ? stream.ReadByte() : typeCode2);
        instance[key] = obj;
    }
    return instance;
}

/**
 * 
 * @param {Stream} stream 
 * @param {number} type 
 */
const Deserialize = (stream, type) => {
    switch (type/*?*/) {
        case 0:
        case 42:
            return null;
        case 68:
            return DeserializeDictionary(stream);
        case 97:
            return DeserializeStringArray(stream);
        case 98:
            return DeserializeByte(stream);
        case 99:
            const customTypeCode = stream.ReadByte();
            return DeserializeCustom(stream, customTypeCode);
        case 100:
            return DeserializeDouble(stream);
        case 101:
            return DeserializeEventData(stream);
        case 102:
            return DeserializeFloat(stream);
        case 104:
            return DeserializeHashTable(stream);
        case 105:
            return DeserializeInteger(stream);
        case 107:
            return DeserializeShort(stream);
        case 108:
            return DeserializeLong(stream);
        case 110:
            return DeserializeIntArray(stream);
        case 111:
            return DeserializeBoolean(stream);
        case 112:
            return DeserializeOperationResponse(stream);
        case 113:
            return DeserializeOperationRequest(stream);
        case 115:
            return DeserializeString(stream);
        case 120:
            return DeserializeByteArray(stream);
        case 121:
            return DeserializeArray(stream);
        case 122:
            return DeserializeObjectArray(stream);
        default:
            throw new Error("Deserialize(): " + type + " pos: " + stream.Position + " bytes: " + stream.Length + ". " + stream);
    }
}

module.exports.decodeParamsWithDebug = (stream, debuggableCommand = false) => {
    let dictionary = {}
    if (debuggableCommand) {
        const debugMessage = Deserialize(stream, stream.ReadByte());
        dictionary = { debugMessage };
    }

    const num = DeserializeShort(stream);

    for (let i = 0; i < num; ++i) {
        const key = stream.ReadByte();
        let obj = Deserialize(stream, stream.ReadByte());

        dictionary[key] = obj;
    }

    return dictionary;
}