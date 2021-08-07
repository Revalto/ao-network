const BinaryReader = require('./BinaryReader');
const { Protocol16 } = require('./PhotonParser');

class AODecoder {
    constructor(events, debug) {
        this.events = events;
        this.debug = debug;

        this.commandHeaderLength = 12;
        this.photonHeaderLength = 12;

        this.commandType = {
            Disconnect: 4,
            SendReliable: 6,
            SendUnreliable: 7,
            SendFragment: 8
        };

        this.messageType = {
            OperationRequest: 2,
            OperationResponse: 3,
            Event: 4
        };

        this.Deserializer = new Protocol16.Deserializer();
        this._pendingSegments = {};
    }

    packetHandler(buf) {
        if(buf.length < this.photonHeaderLength) {
            return;
        }

        let p = new BinaryReader(buf);

        const peerId        = p.ReadInt16();
        const flags         = p.ReadUInt8();
        const commandCount  = p.ReadUInt8();
        const timestamp     = p.ReadUInt32();
        const challenge     = p.ReadUInt32();

        const isEncrypted = flags == 1;
        const isCrcEnabled = flags == 204;

        if(isEncrypted) {
            if(this.debug === true) {
                console.log(`Encrypted packages are not supported`);
            }
    
            return;
        }

        for(let commandIdx = 0; commandIdx < commandCount; commandIdx++) {
            this.handleCommand(p);
        }
    }

    handleCommand(p) {
        const commandType       = p.ReadUInt8();
        const channelId         = p.ReadUInt8();
        const commandFlags      = p.ReadUInt8();
        const unkBytes          = p.ReadUInt8();
        let commandLength       = p.ReadUInt32();
        const sequenceNumber    = p.ReadUInt32();

        commandLength -= this.commandHeaderLength;

        if(commandType == this.commandType.Disconnect) {
            return;
        }

        else if(commandType == this.commandType.SendReliable || commandType == this.commandType.SendUnreliable) {
            if(commandType == this.commandType.SendUnreliable) {
                p.position += 4;
                commandLength -= 4;
            }
    
            this.handleSendReliable(p, commandLength);
            return;
        }

        else if(commandType == this.commandType.SendFragment) {
            this.handleSendFragment(p, commandLength);
            return;
        }

        p.position += commandLength;

        return;
    }

    handleSendReliable(p, commandLength) {
        p.position++;
        commandLength--;

        let messageType = p.ReadUInt8();
        commandLength--;

        let operationLength = commandLength;
        let payload = new Protocol16.Stream(commandLength);
        payload.writeBuffer(p.buf, p.position, commandLength);

        p.position += operationLength;

        switch(messageType) {
            case this.messageType.OperationRequest:
                this.events.myEmit(
                    this.messageType.OperationRequest, 
                    this.Deserializer.deserializeOperationRequest(payload)
                );
            break;

            case this.messageType.OperationResponse:
                this.events.myEmit(
                    this.messageType.OperationResponse, 
                    this.Deserializer.deserializeOperationResponse(payload)
                );
            break; 

            case this.messageType.Event:
                this.events.myEmit(
                    this.messageType.Event, 
                    this.Deserializer.deserializeEventData(payload)
                );
            break;
        }
    }

    handleSendFragment(p, commandLength) {
        const startSequenceNumber = p.ReadUInt32();
        commandLength -= 4;
        const fragmentCount = p.ReadUInt32();
        commandLength -= 4;
        const fragmentNumber = p.ReadUInt32();
        commandLength -= 4;
        const totalLength = p.ReadUInt32();
        commandLength -= 4;
        const fragmentOffset = p.ReadUInt32();

        let fragmentLength = commandLength;

        this.handleSegmentedPayload(startSequenceNumber, totalLength, fragmentLength, fragmentOffset, p);
    }

    handleFinishedSegmentedPackage(totalPayload) {
        let p = new BinaryReader(totalPayload);

        this.handleSendReliable(p, totalPayload.length);
    }

    handleSegmentedPayload(startSequenceNumber, totalLength, fragmentLength, fragmentOffset, p) {
        let segmentedPackage = this.getSegmentedPackage(startSequenceNumber, totalLength);
    
        p.buf.copy(segmentedPackage.totalPayload, fragmentOffset, p.position, p.position + fragmentLength);
        p.position += fragmentLength;
        segmentedPackage.bytesWritten += fragmentLength;

        if(segmentedPackage.bytesWritten >= segmentedPackage.totalLength) {
            delete this._pendingSegments[startSequenceNumber];
            this.handleFinishedSegmentedPackage(segmentedPackage.totalPayload);
        }
    }

    getSegmentedPackage(startSequenceNumber, totalLength) {
        if(this._pendingSegments.hasOwnProperty(startSequenceNumber)) {
            return this._pendingSegments[startSequenceNumber];
        }

        this._pendingSegments[startSequenceNumber] = {
            totalLength,
            bytesWritten: 0,
            totalPayload: new Buffer(totalLength)
        };

        return this._pendingSegments[startSequenceNumber];
    }
}

module.exports = AODecoder;