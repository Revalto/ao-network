const EventEmitter = require('events');

class MyEmitter extends EventEmitter {
    myEmit(event, context) {
        this.emit(event, context);
        this.emit('*', { event, context });
    }

    use(callback = () => {}) {
        this.on('*', callback);
    }
}

module.exports = MyEmitter;