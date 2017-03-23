const net = require('net');
const master = require('./master');
const Connection = require('./connection');
const address = JSON.parse(process.env.SOCKETIPC_ADDRESS);
const cluster = require('cluster');

let socket = net.connect(address);
let connection = new Connection(socket);

const _init = connection.call('__init', { pid: process.pid });

let isAlias = false;

class AlreadyAliasError extends Error {
  constructor() {
    super('socket ipc already alias error');
    this.name = 'SOCKET_IPC_ALREADY_ALIAS_ERROR';
    this.status = 400;
  }
}

class IPC {

  static call(...args) { return connection.call(...args); }

  static register(what, ...args) {
    if (typeof what === 'object') {
      Object.keys(what).forEach(name => IPC.register(name, what[name]));
    } else {
      connection.register(what, ...args);
    }
  }

  static broadcast(...args) {
    if (master) {
      return master.__broadcast(null, { args });
    } else {
      return connection.call('__broadcast', { args });
    }
  }

  static broadcastIgnoreMaster(...args) {
    if (master) {
      return master.__broadcast(null, { args, ignores: [ 'master' ] });
    } else {
      return connection.call('__broadcast', { args, ignores: [ 'master' ] });
    }
  }

  static broadcastIgnoreSelf(...args) {
    if (master) {
      return master.__broadcast(null, { args, ignores: [ process.pid ] });
    } else {
      return connection.call('__broadcast', { args, ignores: [ process.pid ] });
    }
  }

  static registerMaster(what, ...handlers) {
    if (!master) throw new Error('the `registerMaster` method can only be called in master');
    if (typeof what === 'object') {
      let tasks = Object.keys(what).map(name => master.__registerMaster(null, { name, handlers: what[name] }));
      return Promise.all(tasks);
    } else {
      return master.__registerMaster(null, { name: what, handlers });
    }
  }

  static callWorker(pid, ...args) { return connection.call('__callWorker', { pid, args }); }

  static ready() {
    return _init;
  }

  static callAlias(alias, ...args) { return connection.call('__callAlias', { alias, args }); }

  static setAlias(alias, ...args) {
    if (isAlias) {
      throw new AlreadyAliasError();
    }

    isAlias = true;
    if (master) {
      return master.__setAlias(null, {alias, pid: process.pid})
    } else {
      cluster.worker.process.on('exit', () => {
        return connection.call('__deleteAlias', { alias, pid: process.pid });
      });
      return connection.call('__setAlias', { alias, pid: process.pid });
    }
  }

};

module.exports = IPC;
