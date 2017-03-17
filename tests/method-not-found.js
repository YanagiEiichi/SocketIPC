const cluster = require('cluster');
const SocketIPC = require('..');
const assert = require('assert');

let p = 0;

if (cluster.isMaster) {
  cluster.fork().on('online', () => {
    SocketIPC.broadcast('hehe').then(() => {
      console.error('hehe must be not-found');
      process.exit(1);
    }, error => {
      assert.equal(error.name, 'SOCKET_IPC_METHOD_NOT_FOUND');
      SocketIPC.call('ok');
    });
  });
  SocketIPC.registerMaster('ok', () => {
    p++;
    if (p === 2) process.exit(0);
  });
} else {
  SocketIPC.call('hehe').then(() => {
    console.error('hehe must be not-found');
    process.exit(1);
  }, error => {
    assert.equal(error.name, 'SOCKET_IPC_METHOD_NOT_FOUND');
    SocketIPC.call('ok');
  });
}

setTimeout(() => process.exit(1), 1000);
