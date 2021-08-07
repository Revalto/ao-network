const AONetwork = require('./app');
const aoNet = new AONetwork();

/**
 * All events
 */
aoNet.events.use((result) => {
    console.log(result.context);
});

/**
 * Event
 */
aoNet.events.on(aoNet.AODecoder.messageType.Event, (context) => {
    if(!context.parameters.hasOwnProperty('252')) {
        return;
    }

    console.log(context);
});

/**
 * OperationResponse
 */
aoNet.events.on(aoNet.AODecoder.messageType.OperationResponse, (context) => {
    console.log(context);
});

/**
 * OperationRequest
 */
aoNet.events.on(aoNet.AODecoder.messageType.OperationRequest, (context) => {
    console.log(context);
});

/**
 * Auction
 */
aoNet.events.on(aoNet.AODecoder.messageType.OperationResponse, (context) => {
    if(!context.parameters.hasOwnProperty('253') || context.parameters['253'] != aoNet.data.operations.AUCTION_MODIFY_AUCTION) {
        return;
    }

    console.log(context);
});