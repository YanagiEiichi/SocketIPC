const cluster = require('cluster');
const SequenceTester = require('sequence-tester');
const IPC = require('..');

const die = error => {
  console.error(error);
  process.exit(1);
};

if (cluster.isMaster) {

  const st = new SequenceTester([
    'SOCKET_IPC_METHOD_NOT_FOUND', /\bhehe\b/,
    'SOCKET_IPC_METHOD_NOT_FOUND', /\bhehe\b/,
    'SOCKET_IPC_METHOD_NOT_FOUND', /\bhehe\b/
  ]);

  st.then(() => {
    process.exit(0);
  }, die);

  IPC.registerMaster('ready', () => {
    IPC.broadcast('hehe').then(die, ({ name, message }) => {
      st.assert(name);
      st.assert(message);
    });
  });

  IPC.registerMaster('assert', ({ name, message }) => {
    st.assert(name);
    st.assert(message);
  });

  cluster.fork();

} else {

  IPC.call('ready');

  IPC.call('hehe').then(die, error => {
    IPC.call('assert', error);
  });

  IPC.broadcast('hehe').then(die, error => {
    IPC.call('assert', error);
  });

}
