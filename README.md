# 🌐 AO Network Packet Analyzer

**Capture & Decode Albion Online Network Traffic in Real-Time**

[![npm version](https://img.shields.io/npm/v/ao-network?color=success)](https://www.npmjs.com/package/ao-network)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

A modern packet sniffer specialized for Albion Online, providing deep insights into game network operations.
Forked from [rsxdalv/albion-trader](https://github.com/rsxdalv/albion-trader) with enhanced capabilities.

✨ **Key Features**
- Real-time packet capture and decoding
- Event-driven architecture
- Auction house monitoring
- Player operation tracking
- Customizable event handlers

## 🚀 Getting Started

### Prerequisites

- **Node.js** v14+ [Download](https://nodejs.org/)
- **Windows**: [Npcap](https://nmap.org/npcap/) (WinPcap-compatible)
- **Linux/macOS**: `libpcap` + dev packages

### Installation

```
npm install ao-network
```

## 📖 Usage Guide

### Basic Setup
```
const AONetwork = require('ao-network');
const aoNet = new AONetwork();

// Enable global packet processing
aoNet.events.use((result) => {
    console.log('[Raw Packet]', result.context);
});
```

### 🎯 Event Monitoring Examples

#### 1. Generic Event Capture
```
aoNet.events.on(aoNet.AODecoder.messageType.Event, (context) => {
    if(!context.parameters.hasOwnProperty('252')) {
        return;
    }

    console.log('[Game Event]', context);
});
```

#### 2. Auction House Interactions
```
aoNet.events.on(aoNet.AODecoder.messageType.OperationResponse, (context) => {
    if(!context.parameters.hasOwnProperty('253') || context.parameters['253'] != aoNet.data.operations.AuctionModifyAuction) {
        return;
    }

    console.log('[Auction Update]', context);
});
```

#### 3. Player Operations Tracking
```
aoNet.events.on(aoNet.AODecoder.messageType.OperationRequest, (context) => {
    console.log(context);
});
```

---

**Happy Packet Sniffing!** 👾🕵️♂️
