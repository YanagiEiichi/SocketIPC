const cluster = require('cluster');

class PidNotFoundError extends Error {
  constructor() {
    super('PID not found in SocketIPC');
    this.name = 'SOCKET_IPC_PID_NOT_FOUND';
    this.status = 400;
  }
}

if (cluster.isMaster) {

  const net = require('net');
  const Connection = require('./connection');
  const { buildChains } = require('./utils');
  const storage = new Map();

  const __init = buildChains(function({ pid }) {
    storage.set(pid, this);
    this.socket.on('error', () => this.socket.destroy());
    this.socket.on('timeout', () => this.socket.destroy());
    this.socket.on('close', () => storage.delete(pid));
  });

  const __broadcast = buildChains(function({ args, ignores = [] }) {
    let results = [];
    storage.forEach((connection, pid) => {
      if (~ignores.indexOf(pid)) return;
      if (pid === process.pid && ~ignores.indexOf('master')) return;
      results.push(connection.call(...args));
    });
    let all = Promise.all(results);
    results.then = (...args) => all.then(...args);
    results.catch = (...args) => all.catch(...args);
    return results;
  });

  const __registerMaster = buildChains(function({ name, handlers }) {
    table[name] = buildChains(...[].concat(handlers));
  });

  const __callWorker = buildChains(function({ pid, args }) {
    for (let [ thisPid, connection ] of storage) {
      if (thisPid === pid) return connection.call(...args);
    }
    throw new PidNotFoundError();
  });

  let table = { __init, __broadcast, __registerMaster, __callWorker };

  let server = net.createServer(socket => {
    void new Connection(socket, table);
  }).listen();

  server.unref();

  process.env.SOCKETIPC_ADDRESS = JSON.stringify(server.address());

  module.exports = table;

} else {

  module.exports = null;

}
