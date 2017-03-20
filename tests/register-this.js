const cluster = require('cluster');
const IPC = require('..');
const SequenceTester = require('sequence-tester');

if (cluster.isMaster) {

  const st = new SequenceTester([ true, true ]);

  st.then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
  });

  IPC.registerMaster({
    init() {
      this.call('getPort').then(port => {
        st.assert(this.socket.remotePort === port);
      });
    }
  });

  cluster.fork();
  cluster.fork();

} else {

  IPC.call('init');

  IPC.register({
    getPort() {
      return this.socket.localPort;
    }
  });

}
