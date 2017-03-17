const cluster = require('cluster');
const SocketIPC = require('..');
const assert = require('assert');

class HeheError extends Error {
  constructor() {
    super();
    this.name = 'hehe';
  }
}

if (cluster.isMaster) {
  SocketIPC.registerMaster({
    add(params) { return params.reduce((a, b) => a + b, 0); },
    mul(params) { return params.reduce((a, b) => a * b, 1); },
    error() { throw new HeheError(); },
    exit(params) { process.exit(params); }
  });
  cluster.fork();
} else {
  let inc = 0;
  const die = (error) => {
    console.error(error);
    SocketIPC.call('exit', 1);
  };
  SocketIPC.call('add', [ 5, 7, 12 ]).then(result => {
    assert.equal(result, 24);
    inc++;
  }).catch(die);
  SocketIPC.call('mul', [ 2, 3, 4 ]).then(result => {
    assert.equal(result, 24);
    inc++;
  }).catch(die);
  SocketIPC.call('error').catch(result => {
    assert.deepEqual(result, { name: 'hehe' });
    inc++;
  }).catch(die);
  setTimeout(() => {
    assert.equal(inc, 3);
    SocketIPC.call('exit', 0);
  }, 1000);
}
