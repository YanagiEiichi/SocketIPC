const cluster = require('cluster');
const SequenceTester = require('sequence-tester');
const IPC = require('..');

const die = () => {
  console.error('hehe must be not-found');
  process.exit(1);
};

if (cluster.isMaster) {

  const st = new SequenceTester([
    'SOCKET_IPC_METHOD_NOT_FOUND',
    'SOCKET_IPC_METHOD_NOT_FOUND',
    'SOCKET_IPC_METHOD_NOT_FOUND'
  ]);

  st.then(() => {
    process.exit(0);
  }, die);

  IPC.registerMaster('ready', () => {
    IPC.broadcast('hehe').then(die, error => {
      st.assert(error.name);
    });
  });

  IPC.registerMaster('assert', ({ name }) => {
    st.assert(name);
  });

  cluster.fork();

} else {

  IPC.call('ready');

  IPC.call('hehe').then(die, error => {
    IPC.call('assert', { name: error.name });
  });

  IPC.broadcast('hehe').then(die, error => {
    IPC.call('assert', { name: error.name });
  });

}
