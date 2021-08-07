const { Cap, decoders } = require('cap');
const { PROTOCOL }      = decoders;
const network           = require('network');
const AODecoder         = require('./libs/AODecoder');
const Events            = require('./libs/Events');
const data              = require('./data');

class App {
    constructor(debug = false) {
        this.debug      = debug;

        this.cap        = new Cap();
        this.events     = new Events();
        this.AODecoder  = new AODecoder(this.events, this.debug);
        this.data       = data;

        this.PROTOCOL   = PROTOCOL;
        this.linkType   = null;
        this.buffer     = Buffer.alloc(65535);

        this.init();
    }

    init = () => {
        network.get_active_interface((err, obj) => {
            if (err) {
                throw new Error("Can't find active network interface (disconnected?)")
            }
        
            const device = Cap.findDevice(obj.ip_address);
            const filter = 'udp and port 5056';
            const bufSize = 10 * 1024 * 1024;

            this.linkType = this.cap.open(device, filter, bufSize, this.buffer);
            this.cap.setMinBytes && this.cap.setMinBytes(0);
            this.cap.on('packet', this.onPacket);
        });
    }

    onPacket = (nBytes, trunc) => {
        if(this.linkType !== 'ETHERNET') {
            return;
        }
    
        let ret = decoders.Ethernet(this.buffer);
    
        if(ret.info.type !== this.PROTOCOL.ETHERNET.IPV4) {
            if(this.debug) {
                console.log('Unsupported Ethertype: ' + this.PROTOCOL.ETHERNET[ret.info.type]);
            }
    
            return;
        }
    
        ret = decoders.IPV4(this.buffer, ret.offset);
    
        if(ret.info.protocol !== this.PROTOCOL.IP.UDP) {
            if(this.debug) {
                console.log('Unsupported IPv4 protocol: ' + this.PROTOCOL.IP[ret.info.protocol]);
            }
    
            return;
        }
    
        ret = decoders.UDP(this.buffer, ret.offset);

        if(ret.info.srcport != 5056 && ret.info.dstport != 5056) {
            return;
        }

        this.AODecoder.packetHandler(this.buffer.slice(ret.offset));
    }
}

module.exports = App;