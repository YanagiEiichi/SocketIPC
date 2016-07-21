const cluster = require('cluster');
const SocketIPC = require('../SocketIPC');
const assert = require('assert');

if (cluster.isMaster) {
  new SocketIPC({
    init() {
      setTimeout(() => {
        let result = SocketIPC.call('hehe');
        assert.equal(result.length, 0);
        process.exit(0);
      }, 500);
    },
    exit(params) { process.exit(params); }
  });
  let worker = cluster.fork();
} else {
  SocketIPC.call('init').then(() => {
    process.exit(1);
  });
}
