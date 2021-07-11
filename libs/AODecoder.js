const { streamConstructor, decodeParamsWithDebug } = require('./Deserialize');
const { normalizeObject, fragmentDecode  } = require('./utils');
const { list } = require('../data/operations');

class AODecoder {
    constructor(events, debug) {
        this.events = events;
        this.debug = debug;

        this.fragments = {};

        this.commandTypes = {
            1: "Acknowledge",
            2: "Connect",
            3: "Verify connect",
            4: "Disconnect",
            5: "Ping",
            6: "Send reliable",
            7: "Send unreliable",
            8: "Send reliable fragment",
            9: "Send unsequenced",
            10: "Configure bandwidth limit",
            11: "Configure throttling",
            12: "Fetch server timestamp"
        }
        
        this.commandTypesEnum = {
            "ACKNOWLEDGE": 1,
            "CONNECT": 2,
            "VERIFY_CONNECT": 3,
            "DISCONNECT": 4,
            "PING": 5,
            "SEND_RELIABLE": 6,
            "SEND_UNRELIABLE": 7,
            "SEND_RELIABLE_FRAGMENT": 8,
            "SEND_UNSEQUENCED": 9,
            "CONFIGURE_BANDWIDTH_LIMIT": 10,
            "CONFIGURE_THROTTLING": 11,
            "FETCH_SERVER_TIMESTAMP": 12
        }
        
        this.channelNames = {
            1: "Photon view instantiation",
            2: "VoIP",
            3: "RPC",
            4: "Photon view serialization"
        }
        
        this.messageTypes = {
            2: "Operation request",
            3: "Operation response",
            4: "Event data",
            7: "Operation response",
        }
        
        this.messageTypesEnum = {
            "OPERATION_REQUEST": 2,
            "OPERATION_RESPONSE": 3,
            "EVENT_DATA": 4,
            "OPERATION_RESPONSE_ALT": 7,
        }
        
        this.operationNames = {
            220: "GetRegions",
            221: "GetLobbyStats",
            222: "FindFriends",
            223: "DebugGame",
            224: "CancelJoinRandomGame",
            225: "JoinRandomGame",
            226: "JoinGame",
            227: "CreateGame",
            228: "LeaveLobby",
            229: "JoinLobby",
            230: "Authenticate",
            248: "ChangeGroups",
            249: "Ping",
            251: "GetProperties",
            252: "SetProperties",
            253: "RaiseEvent",
            254: "Leave",
            255: "Join"
        }
        
        this.eventNames = {
            210: "AzureNodeInfo",
            224: "TypedLobbyStats",
            226: "AppStats",
            227: "Match",
            228: "QueueState",
            229: "GameListUpdate",
            230: "GameList",
            253: "PropertiesChanged",
            254: "Leave",
            255: "Join",
            
            200: "RPC",
            201: "SendSerialize",
            202: "Instantiation",
            203: "CloseConnection",
            204: "Destroy",
            205: "RemoveCachedRPCs",
            206: "SendSerializeReliable",
            207: "DestroyPlayer",
            208: "AssignMaster",
            209: "OwnershipRequest",
            
            211: "VacantViewIds",

            135: "MulticastRPC",
            179: "VoIP"
        }
    }

    parseIncoming = (buf, tree = {}) => {
        let idx = 12;

        tree.commands = [];
        tree.peerId = buf.readInt16BE(0);
        tree.CRCEnabled = buf.readUInt8(2);
        tree.commandCount = buf.readUInt8(3);
        tree.timestamp = buf.readUInt32BE(4);
        tree.challenge = buf.readUInt32BE(8);

        const cmdCount = tree.commandCount;
        for (let i = 0; i < cmdCount; i++) {
            if(!idx || idx < 0 || idx > 65492) {
                return;
            }

            tree.commands[i] = { 
                root: tree 
            };

            idx = this.parseCommand(buf, tree.commands[i], idx);
        }
    };

    parseCommand = (buf, tree, offset) => {
        let idx = offset;

        tree.commandType = buf.readUInt8(idx);
        tree.channelId = buf.readUInt8(idx + 1);
        tree.commandFlags = buf.readUInt8(idx + 2);
        tree.reservedByte = buf.readUInt8(idx + 3);
        tree.commandLength = buf.readUInt32BE(idx + 4);
        tree.relSeqNum = buf.readUInt32BE(idx + 8);

        const commandHeaderLength = 12;
        const commandLength = tree.commandLength;
        idx = idx + commandHeaderLength;

        let command = tree.commandType;

        let dataLength = null;
        switch (command) {
            case this.commandTypesEnum.ACKNOWLEDGE: 
                return this.parseAcknowledgement(buf, tree, idx);

            case this.commandTypesEnum.SEND_UNRELIABLE: 
                return this.parseSendUnreliable(buf, tree, idx, commandLength, commandHeaderLength);

            case this.commandTypesEnum.SEND_RELIABLE_FRAGMENT: 
                return this.parseFragmentCommand(buf, tree, idx, commandLength, commandHeaderLength);

            case this.commandTypesEnum.CONNECT:
                dataLength = commandLength - commandHeaderLength;
                tree.connData = buf.toString('ascii', idx, idx + dataLength);

                return idx + dataLength

            case this.commandTypesEnum.VERIFY_CONNECT:
                dataLength = commandLength - commandHeaderLength;
                tree.connverifyData = buf.toString('ascii', idx, idx + dataLength);

                return idx + dataLength;

            case this.commandTypesEnum.SEND_RELIABLE:
                dataLength = commandLength - commandHeaderLength;

                return this.readMessage(buf, idx, dataLength, tree);

            case 0:
            case this.commandTypesEnum.FETCH_SERVER_TIMESTAMP:
            case this.commandTypesEnum.DISCONNECT:
            case this.commandTypesEnum.PING: 
                return idx;

            default:
                if(this.debug) {
                    console.log("unrecognized command", command, tree, this.commandTypes[command]);
                }

                return idx;
        }
    };

    parseAcknowledgement = (buf, tree, idx) => {
        const commandMetaLength = 8;

        tree.ackRecvrelseqnum = buf.readUInt32BE(idx);
        tree.ackRecvsenttime = buf.readUInt32BE(idx + 4);

        return idx + commandMetaLength
    };

    parseSendUnreliable = (buf, tree, idx, commandLength, commandHeaderLength) => {
        const commandMetaLength = 4;
        const dataLength = commandLength - commandHeaderLength - commandMetaLength;

        tree.sendunrelUnrelseqnum = buf.readUInt32BE(idx);

        return this.readMessage(buf, idx + commandMetaLength, dataLength, tree)
    };

    parseFragmentCommand = (buf, tree, idx, commandLength, commandHeaderLength) => {
        const commandMetaLength = 20;

        tree.sendfragStartseqnum = buf.readUInt32BE(idx);
        tree.sendfragFragcount = buf.readUInt32BE(idx + 4);
        tree.sendfragFragnum = buf.readUInt32BE(idx + 8);
        tree.sendfragTotallen = buf.readUInt32BE(idx + 12);
        tree.sendfragFragoff = buf.readUInt32BE(idx + 16);

        const sendfrag_fragnum = tree.sendfragFragnum;
        let addLength = 0;

        if (sendfrag_fragnum == 0) {
            tree.customSignature = buf.readUInt8(idx + 20);
            tree.customCommandtype = buf.readUInt8(idx + 21);
            tree.customOpCode = buf.readUInt8(idx + 22);
            tree.customReturnCode = buf.readUInt8(idx + 23);
            tree.customDebugMessage = buf.readUInt8(idx + 24);
        }

        const dataLength = commandLength - commandHeaderLength - commandMetaLength - addLength;
        const start = idx + commandMetaLength + addLength;

        tree.sendfragData = buf.toString('hex', start, start + dataLength)
    
        const fragId = tree.sendfragStartseqnum;
        this.fragments[fragId] = this.fragments[fragId] || {};

        const fragmentRef = this.fragments[fragId];
        fragmentRef[sendfrag_fragnum] = tree;

        if (Object.keys(fragmentRef).length === tree.sendfragFragcount) {
            this.readMessage(
                Buffer.from(
                    fragmentDecode(fragmentRef), 'hex'
                ), 0, tree.sendfragTotallen, {}
            )
        }

        return idx + dataLength + commandMetaLength + addLength;
    }

    readMessage = (buf, idx, len, root) => {
        root.msg = {};

        const tree = root.msg;
        const headerLength = 2

        tree.commandMsgSignifier = buf.readUInt8(idx)
        tree.commandMsgType = buf.readUInt8(idx + 1)
    
        const msgType = tree.commandMsgType
        idx = idx + headerLength
        let dataLength, metaLength, start, result

        switch (msgType) {
            case this.messageTypesEnum.OPERATION_REQUEST:
                metaLength = 3 - 2 // debug op fix
                dataLength = len - headerLength - metaLength

                tree.commandOpCode = buf.readUInt8(idx)
                tree.commandMsgParametercount = buf.readUInt16BE(idx + 1)

                start = idx + metaLength

                tree.commandMsgParameters = buf.toString('hex', start, start + dataLength)

                result = ({
                    type: "OPERATION_REQUEST",
                    data: decodeParamsWithDebug(
                        streamConstructor(buf, start), false
                    )
                });
                
                this.events.myEmit('OPERATION_REQUEST', normalizeObject(result.data));

                return idx + metaLength + dataLength;

            case this.messageTypesEnum.OPERATION_RESPONSE: 
            case this.messageTypesEnum.OPERATION_RESPONSE_ALT:
                metaLength = 6 - 1 - 2 // debug op fix
                dataLength = len - headerLength - metaLength

                tree.commandOpCode = buf.readUInt8(idx)
                tree.commandOpReturncode = buf.readUInt16BE(idx + 1)
                tree.commandOpDebug = buf.readUInt8(idx + 3)
                tree.commandMsgParametercount = buf.readUInt16BE(idx + 4)

                start = idx + metaLength

                tree.commandMsgParameters = buf.toString('hex', start, start + dataLength)

                result = ({
                    type: "OPERATION_RESPONSE",
                    data: decodeParamsWithDebug(
                        streamConstructor(buf, start), true
                    )
                });

                const OP_TYPE_KEY = 253;
                if(result.data[OP_TYPE_KEY]) {
                    this.events.myEmit(list[result.data[OP_TYPE_KEY]], normalizeObject(result.data));
                }

                return idx + metaLength + dataLength

            case this.messageTypesEnum.EVENT_DATA:
                metaLength = 1
                dataLength = len - headerLength - metaLength

                tree.commandEvCode = buf.readUInt8(idx)
                tree.commandMsgParametercount = buf.readUInt16BE(idx + 1)

                start = idx + metaLength

                tree.commandMsgParameters = buf.toString('hex', start, start + dataLength)

                result = ({
                    type: "EVENT_DATA",
                    data: decodeParamsWithDebug(
                        streamConstructor(buf, start), false
                    )
                });

                this.events.myEmit('EVENT_DATA', normalizeObject(result.data));
                
                return idx + metaLength + dataLength
        }

        return idx
    }
}

module.exports = AODecoder;