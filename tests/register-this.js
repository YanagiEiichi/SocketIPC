const cluster = require('cluster');
const SocketIPC = require('../SocketIPC');
const assert = require('assert');

if (cluster.isMaster) {
  let inc = 0;
  SocketIPC.registerMaster({
    init() {
      this.call('getPort').then(port => {
        assert.equal(this.socket.remotePort, port);
        if (++inc === 2) process.exit(0);
      });
    },
  });
  cluster.fork();
  cluster.fork();
} else {
  SocketIPC.call('init');
  SocketIPC.register({
    getPort() {
      return this.socket.localPort;
    }
  });
}

setTimeout(() => process.exit(1), 5000);
