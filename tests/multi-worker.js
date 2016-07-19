const cluster = require('cluster');
const SocketIPC = require('../SocketIPC');
const assert = require('assert');

if (cluster.isMaster) {
  const TEST_COUNT = 32;
  let count = 0;
  new SocketIPC({
    init() {
      if (++count === TEST_COUNT) {
        SocketIPC.call('exit').then(() => {
          setTimeout(() => {
            let hehe = SocketIPC.call('hehe');
            assert.equal(hehe.length, 0);
            process.exit(0);
          }, 100);
        }).catch(console.error);
      }
    }
  });
  for (let i = 0; i < TEST_COUNT; i++) cluster.fork();
} else {
  new SocketIPC({
    exit() {
      setTimeout(() => {
        process.exit(0);
      });
    }
  });
  SocketIPC.call('init');
}
