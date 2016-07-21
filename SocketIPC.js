const net = require('net');
const cluster = require('cluster');
const { Readable } = require('stream');
const { EventEmitter } = require('events');
const FrameGenerator = require('FrameGenerator');

const registeredMethods = Symbol();
const inc = Symbol();
const callings = Symbol();

const send = (that, data) => {
  let json = new Buffer(JSON.stringify(data));
  let length = new Buffer(4);
  length.writeUInt32LE(json.length);
  that.socket.write(length);
  that.socket.write(json);
};

const receive = (that, frame) => {
  let { type, method, id, params } = frame;
  switch (type) {
    case 'call':
      let chains = that[registeredMethods][method];
      if (!chains) return send(that, { id, type: 'error', params: { name: 'SOCKET_IPC_METHOD_NOT_FOUND' } });
      Promise.resolve(params).then(ctx => chains(that, ctx, 0)).then(
        params => send(that, { id, type: 'resolve', params }),
        params => send(that, { id, type: 'reject', params })
      );
      break;
    case 'resolve':
    case 'reject':
      let calling = that[callings].get(id);
      if (!calling) break;
      that[callings].delete(id);
      calling[type](params);
  }
};

// build handlers to koa style middleware
const buildChains = (...handlers) => {
  return function callee(that, ctx, index) {
    if (index >= handlers.length) return null;
    let handler = handlers[index];
    if (typeof handler !== 'function') return callee(that, ctx, index + 1);
    return handler.call(that, ctx, () => callee(that, ctx, index + 1));
  };
};

class SocketIPC {
  constructor(socket, table = null) {
    this.socket = socket;
    this[registeredMethods] = Object.create(table);
    this[inc] = 1;
    this[callings] = new Map();
    socket.pipe(new FrameGenerator(function*() {
      return JSON.parse(yield (yield 4).readUInt32LE());
    })).on('data', frame => receive(this, frame));
  }
  register(name, ...handlers) {
    this[registeredMethods][name] = buildChains(...handlers);
  }
  call(method, params) {
    return new Promise((resolve, reject) => {
      let type = 'call';
      let id = this[inc]++;
      this[callings].set(id, { resolve, reject });
      send(this, { method, params, type, id });
    });
  }
}

if (cluster.isMaster) {
  let table = Object.create(null);
  let storage = new Set();
  let server = net.createServer(socket => {
    let ipc = new SocketIPC(socket, table);
    storage.add(ipc);
    socket.on('close', () => storage.delete(ipc));
  }).listen();
  process.env.SOCKETIPC_ADDRESS = JSON.stringify(server.address());
  class SocketIPCExport {
    constructor(table) { for (let name in table) SocketIPCExport.register(name, table[name]); }
    static call(...args) {
      let results = Array.from(storage, item => item.call(...args));
      let all = Promise.all(results);
      results.then = (...args) => all.then(...args);
      results.catch = (...args) => all.catch(...args);
      return results;
    }
    static register(name, ...handlers) { table[name] = buildChains(...handlers); }
    call(...args) { return SocketIPCExport.call(...args); }
    register(...args) { return SocketIPCExport.register(...args); }
  }
  module.exports = SocketIPCExport;
} else {
  let address = JSON.parse(process.env.SOCKETIPC_ADDRESS);
  let socket = net.connect(address);
  let ipc = new SocketIPC(socket);
  class SocketIPCExport {
    constructor(table) { for (let name in table) ipc.register(name, table[name]); }
    static call(...args) { return ipc.call(...args); }
    static register(...args) { return ipc.register(...args); }
    call(...args) { return ipc.call(...args); }
    register(...args) { return ipc.register(...args); }
  }
  module.exports = SocketIPCExport;
}

process.on('uncaughtException', console.error);
