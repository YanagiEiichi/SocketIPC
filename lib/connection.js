const FrameGenerator = require('FrameGenerator');
const privateStorage = new (require('./private-storage'))();
const { buildChains } = require('./utils');

const protectSpecialFieldsForError = error => {
  let params = JSON.parse(JSON.stringify(error));
  if (error instanceof Error) {
    for (let key of [ 'name', 'message', 'status' ]) {
      if (key in error && !(key in params)) params[key] = error[key];
    }
  }
  return params;
};

class SocketIPCCallTimeout extends Error {
  constructor(message = 'socket ipc call timeout') {
    super(message);
    this.name = 'SOCKET_IPC_CALL_TIMEOUT';
    this.status = 400;
  }
}

class Connection {

  constructor(socket, table = null) {
    this.socket = socket;
    let ps = privateStorage.get(this);
    ps.registeredMethods = Object.create(table);
    ps.inc = 1;
    ps.callingMap = new Map();
    this.timeout = 5000;
    this._initSocket();
  }

  register(name, ...handlers) {
    let ps = privateStorage.get(this);
    ps.registeredMethods[name] = buildChains(...handlers);
  }

  call(options, params) {
    const { method, timeout = this.timeout } = typeof options === 'string' ? { method: options } : options;
    return new Promise((resolve, reject) => {
      let ps = privateStorage.get(this);
      let id = ps.inc++;
      const clock = setTimeout(() => {
        ps.callingMap.delete(id);
        reject(new SocketIPCCallTimeout(`method: ${method} timeout: ${timeout} call timeout.`));
      }, timeout);
      ps.callingMap.set(id, { resolve, reject, clock});
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
        if (!chains) {
          return this._send({
            id, type: 'reject',
            params: {
              name: 'SOCKET_IPC_METHOD_NOT_FOUND',
              message: `SocketIPC method "${method}" not found`
            }
          });
        }
        Promise.resolve(params).then(ctx => chains(this, ctx)).then(
          params => this._send({ id, type: 'resolve', params }),
          error => {
            const params = protectSpecialFieldsForError(error);
            return this._send({ id, type: 'reject', params });
          }
        );
        break;
      case 'resolve':
      case 'reject':
        let calling = ps.callingMap.get(id);
        if (!calling) break;
        ps.callingMap.delete(id);
        clearTimeout(calling.clock);
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
