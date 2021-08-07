class Deserializer {
    constructor() {
        this.type = {
            Unknown: 0,            // \0
            Null: 42,              // *
            Dictionary: 68,        // D
            StringArray: 97,       // a
            Byte: 98,              // b
            Double: 100,           // d
            EventData: 101,        // e
            Float: 102,            // f
            Integer: 105,          // i
            Hashtable: 104,        // j
            Short: 107,            // k
            Long: 108,             // l
            IntegerArray: 110,     // n
            Boolean: 111,          // o
            OperationResponse: 112,// p
            OperationRequest: 113, // q
            String: 115,           // s
            ByteArray: 120,        // x
            Array: 121,            // y
            ObjectArray: 122,      // z
        };
    }

    deserializeTest(input) {
        let result = {};

        const num = this.deserializeShort(input);

        for(let i = 0; i < num; i++) {
            const key = input.ReadByte();
            let obj = this.deserializeHandler(input, input.ReadByte());

            result[key] = obj;
        }

        return result;
    }

    deserialize(input) {
        return this.deserializeHandler(input, input.ReadByte());
    }

    deserializeHandler(input, typeCode) {
        switch(typeCode) {
            case this.type.Unknown:
            case this.type.Null:
                return null;
            case this.type.Dictionary:
                return this.deserializeDictionary(input);
            case this.type.StringArray:
                return this.deserializeStringArray(input);
            case this.type.Byte:
                return this.deserializeByte(input);
            case this.type.Double:
                return this.deserializeDouble(input);
            case this.type.EventData:
                return this.deserializeEventData(input);
            case this.type.Float:
                return this.deserializeFloat(input);
            case this.type.Integer:
                return this.deserializeInteger(input);
            case this.type.Hashtable:
                return this.deserializeHashtable(input);
            case this.type.Short:
                return this.deserializeShort(input);
            case this.type.Long:
                return this.deserializeLong(input);
            case this.type.IntegerArray:
                return this.deserializeIntArray(input);
            case this.type.Boolean:
                return this.deserializeBoolean(input);
            case this.type.OperationResponse:
                return this.deserializeOperationResponse(input);
            case this.type.OperationRequest:
                return this.deserializeOperationRequest(input);
            case this.type.String:
                return this.deserializeString(input);
            case this.type.ByteArray:
                return this.deserializeByteArray(input);
            case this.type.Array:
                return this.deserializeArray(input);
            case this.type.ObjectArray:
                return this.deserializeObjectArray(input);
            default:
                throw new Error(`Type code: ${typeCode} not implemented.`);
        }
    }

    deserializeOperationRequest(stream) {
        const operationCode = this.deserializeByte(stream);
        const parameters = this.deserializeParameterTable(stream);

        return {
            operationCode,
            parameters
        };
    }

    deserializeOperationResponse(stream) {
        const operationCode = this.deserializeByte(stream);
        const returnCode = this.deserializeShort(stream);
        const debugMessage = this.deserializeHandler(stream, this.deserializeByte(stream));
        const parameters = this.deserializeParameterTable(stream);
        
        return {
            operationCode,
            returnCode,
            debugMessage,
            parameters
        };
    }

    deserializeEventData(stream) {
        const code = this.deserializeByte(stream);
        const parameters = this.deserializeParameterTable(stream);

        return {
            code,
            parameters
        };
    }

    deserializeByte(stream) {
        return stream.ReadByte();
    }

    deserializeBoolean(stream) {
        return stream.ReadByte() != 0;
    }

    deserializeShort(stream) {
        return stream.ReadUInt16();
    }

    deserializeInteger(stream) {
        const buf = stream.ReadBytes(4);

        return buf[0] << 24 || buf[1] << 16 || buf[2] << 8 || buf[3];
    }

    deserializeHashtable(input) {
        const size = this.deserializeShort(input);

        return this.deserializeDictionaryElements(input, size, this.type.Unknown, this.type.Unknown);
    }

    deserializeLong(stream) {
        const buf = stream.ReadBytes(8);

        return buf[0] << 56 || buf[1] << 48 || buf[2] << 40 || buf[3] << 32 || buf[4] << 24 || buf[5] << 16 || buf[6] << 8 || buf[7];
    }

    deserializeFloat(stream) {
        return stream.ReadFloat(); 
    }

    deserializeDouble(stream) {
        return stream.ReadDouble();
    }

    deserializeString(stream) {
        const stringSize = this.deserializeShort(stream);
        if(stringSize == 0) {
            return 'empty';
        }

        return stream.ReadBytes(stringSize).toString();
    }

    makeArray(length) {
        return new Array(length).fill(0);
    }

    deserializeByteArray(stream) {
        const count = this.deserializeInteger(stream);

        return this.makeArray(count).map(() => stream.ReadByte());
    }

    deserializeIntArray(stream) {
        const count = this.deserializeInteger(stream);

        return this.makeArray(count).map(() => this.deserializeInteger(stream));
    }

    deserializeStringArray(stream) {
        const count = this.deserializeInteger(stream);

        return this.makeArray(count).map(() => this.deserializeString(stream));
    }

    deserializeObjectArray(stream) {
        const arraySize = this.deserializeShort(stream);

        return this.makeArray(arraySize).map(() => this.deserialize(stream));
    }

    deserializeArray(stream) {
        const length = this.deserializeShort(stream);
        const type = stream.ReadByte();

        switch(type) {
            case this.type.Array:
                let arrayResult = [];
                arrayResult[0] = this.deserializeArray(stream);

                for(let i = 1; i < length; i++) {
                    arrayResult[i] = this.deserializeArray(stream);
                }

                return arrayResult;

            case this.type.ByteArray:
                let byteResult = new Array(length);

                for(let i = 0; i < length; i++) {
                    byteResult[i] = this.deserializeByteArray(stream);
                }

                return byteResult;

            case this.type.Dictionary:
                return [];

            default:
                let result = [];

                for(let i = 0; i < length; i++) {
                    result[i] = this.deserializeHandler(stream, type);
                }

                return result;
        }
    }

    deserializeDictionary(input) {
        const keyTypeCode = input.ReadByte();
        const valueTypeCode = input.ReadByte();
        const dictionarySize = this.deserializeShort(input);
        //const keyType = keyTypeCode == 0 || keyTypeCode == 42; // I dont know
        //const valueType = valueTypeCode == 0 || valueTypeCode == 42; // I dont know
        
        return this.deserializeDictionaryElements(input, dictionarySize, keyTypeCode, valueTypeCode);
    }

    deserializeDictionaryElements(input, dictionarySize, keyTypeCode, valueTypeCode) {
        let instance = {};

        for(let i = 0; i < dictionarySize; i++) {
            const key = this.deserializeHandler(input, keyTypeCode == 0 || keyTypeCode == 42 ? input.ReadByte() : keyTypeCode);
            const value = this.deserializeHandler(input, valueTypeCode == 0 || valueTypeCode == 42 ? input.ReadByte() : valueTypeCode);
        
            instance[key] = value;
        }

        return instance;
    }

    deserializeDictionaryType(input) {
        const keyTypeCode = input.ReadByte();
        const valueTypeCode = input.ReadByte();
        const keyType = keyTypeCode == 0 || keyTypeCode == 42; // I dont know
        const valueType = valueTypeCode == 0 || valueTypeCode == 42; // I dont know
        
        return {
            keyType,
            valueType
        };
    }

    deserializeParameterTable(input) {
        const dictionarySize = this.deserializeShort(input);
        let dictionary = {};

        for(let i = 0; i < dictionarySize; i++) {
            const key = input.ReadByte();
            const valueTypeCode = input.ReadByte();
            const value = this.deserializeHandler(input, valueTypeCode);

            dictionary[key] = value;
        }

        return dictionary;
    }
}

module.exports = Deserializer;