const cluster = require('cluster');

class PidNotFoundError extends Error {
  constructor() {
    super('PID not found in SocketIPC');
    this.name = 'SOCKET_IPC_PID_NOT_FOUND';
    this.status = 400;
  }
}

class AliasNotFoundError extends Error {
  constructor(message = 'socket ipc alias not found') {
    super(message);
    this.name = 'SOCKET_IPC_ALIAS_NOT_FOUND_ERROR';
    this.status = 400;
  }
}

class AlreadyAliasError extends Error {
  constructor(message = 'socket ipc already alias error') {
    super(message);
    this.name = 'SOCKET_IPC_ALREADY_ALIAS_ERROR';
    this.status = 400;
  }
}

if (cluster.isMaster) {

  const net = require('net');
  const Connection = require('./connection');
  const { buildChains } = require('./utils');
  const storage = new Map();
  const aliasMap = new Map();
  const aliasPids = new Set();

  const filterWorkerByPid = function (pid) {
    const workers = cluster.workers;
    for(let i of Object.keys(workers)) {
      const worker = workers[i];
      if (worker.process.pid === pid) {
        return worker;
      }
    }
    throw new PidNotFoundError();
  }

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

  const callWorker = function({ pid, args }) {
    for (let [ thisPid, connection ] of storage) {
      if (thisPid === pid) return connection.call(...args);
    }
    throw new PidNotFoundError();
  }

  const __callWorker = buildChains(callWorker);

  const __callAlias = buildChains(function({ alias, args }) {
    const pidGroup = aliasMap.get(alias);
    if (!pidGroup) {
      throw new AliasNotFoundError(`alias: ${alias} not found`);
    }

    const results = [];
    for(let pid of pidGroup) {
      results.push(callWorker({pid, args}));
    }

    return Promise.all(results);
  });

  const exitDeleteAlias = function (alias, pid) {
    if (process.pid === pid) {
      return Promise.resolve(true);
    }

    const worker = filterWorkerByPid(pid);
    worker.process.once('exit', () => {
      aliasPids.delete(pid);
      const pidGroup = aliasMap.get(alias);
      pidGroup.delete(pid);
      if (pidGroup.size <= 0) {
        aliasMap.delete(alias);
      }
    });
  }

  const __setAlias = buildChains(function({ alias, pid }) {
    if (!storage.has(pid)) throw new PidNotFoundError();

    if (aliasPids.has(pid)) {
      throw new AlreadyAliasError(`${pid} already alias`);
    }

    aliasPids.add(pid);
    let pidGroup = aliasMap.get(alias);

    if (!pidGroup) {
        pidGroup = new Set();
    }

    pidGroup.add(pid);

    aliasMap.set(alias, pidGroup);
    exitDeleteAlias(alias, pid);
    return Promise.resolve(true);
  });

  let table = {
    __init,
    __broadcast,
    __registerMaster,
    __callWorker,
    __setAlias,
    __callAlias
  };

  let server = net.createServer(socket => {
    void new Connection(socket, table);
  }).listen();

  server.unref();

  process.env.SOCKETIPC_ADDRESS = JSON.stringify(server.address());

  module.exports = table;

} else {

  module.exports = null;

}
