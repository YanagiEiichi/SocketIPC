const FrameGenerator = require('FrameGenerator');
const privateStorage = require('./private-storage');
const { buildChains } = require('./utils');

class Connection {

  constructor(socket, table = null) {
    this.socket = socket;
    let ps = privateStorage.get(this);
    ps.registeredMethods = Object.create(table);
    ps.inc = 1;
    ps.callingMap = new Map();
    this._initSocket();
  }

  register(name, ...handlers) {
    let ps = privateStorage.get(this);
    ps.registeredMethods[name] = buildChains(...handlers);
  }

  call(method, params) {
    return new Promise((resolve, reject) => {
      let ps = privateStorage.get(this);
      let id = ps.inc++;
      ps.callingMap.set(id, { resolve, reject });
      this._send({ method, params, type: 'call', id });
    });
  }

  _initSocket() {
    this.socket.unref();
    this.socket.pipe(new FrameGenerator(function *() {
      return JSON.parse(yield (yield 4).readUInt32LE());
    })).on('data', frame => this._receive(frame));
  }

  _receive(frame) {
    let { type, method, id, params } = frame;
    let ps = privateStorage.get(this);
    switch (type) {
      case 'call':
        let chains = ps.registeredMethods[method];
        if (!chains) return this._send({ id, type: 'reject', params: { name: 'SOCKET_IPC_METHOD_NOT_FOUND' } });
        Promise.resolve(params).then(ctx => chains(this, ctx)).then(
          params => this._send({ id, type: 'resolve', params }),
          params => this._send({ id, type: 'reject', params })
        );
        break;
      case 'resolve':
      case 'reject':
        let calling = ps.callingMap.get(id);
        if (!calling) break;
        ps.callingMap.delete(id);
        calling[type](params);
    }
  }

  _send(data) {
    let json = new Buffer(JSON.stringify(data));
    let length = new Buffer(4);
    length.writeUInt32LE(json.length);
    this.socket.write(length);
    this.socket.write(json);
  }

}

module.exports = Connection;
