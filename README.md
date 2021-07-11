
Description
===========

Most of the code was taken from this repository. https://github.com/rsxdalv/albion-trader

You can get information about all incoming packages!


Requirements
============

* [node.js](http://nodejs.org/) -- v4.0.0 or newer

* For Windows: [Npcap with WinPcap compatibility](https://nmap.org/npcap/)

* For *nix: libpcap and libpcap-dev/libpcap-devel packages


Install
============

    npm install


Examples
========

```
const AONetwork = require('./app');
const aoNet = new AONetwork();

/**
 * All events
 */
aoNet.events.use((result) => {
    console.log(result)
})

/**
 * Change location
 */
aoNet.events.on('CraftBuildingChangeSettings', context => {
    const locationId = context['0'];

    console.log(`Change location => ${locationId} ID`);
});

/**
 * Auction
 * 
 * @param {Object} context 
 */
const auction = context => {
    const items = context[0];

    items.forEach(res => console.log(res));
}

aoNet.events.on('AuctionGetMyOpenAuctions', auction);
aoNet.events.on('AuctionModifyAuction', auction);
```