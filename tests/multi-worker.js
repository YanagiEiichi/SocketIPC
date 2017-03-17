const cluster = require('cluster');
const SocketIPC = require('..');
const assert = require('assert');

if (cluster.isMaster) {
  const TEST_COUNT = 32;
  let count = 0;
  SocketIPC.registerMaster({
    init() {
      if (++count === TEST_COUNT) {
        SocketIPC.broadcast('exit').then(() => {
          setTimeout(() => {
            let hehe = SocketIPC.broadcast('hehe');
            assert.equal(hehe.length, 1);
            process.exit(0);
          }, 500);
        }).catch(console.error);
      }
    }
  });
  for (let i = 0; i < TEST_COUNT; i++) cluster.fork();
  SocketIPC.register({ exit() {} });
} else {
  SocketIPC.register({
    exit() {
      setTimeout(() => {
        process.exit(0);
      });
    }
  });
  SocketIPC.call('init');
}
