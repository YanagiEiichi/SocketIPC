const cluster = require('cluster');
const SequenceTester = require('sequence-tester');
const IPC = require('..');

class HeheError extends Error {
  constructor() {
    super();
    this.name = 'hehe';
  }
}

const die = (error) => {
  console.error(error);
  IPC.call('exit', 1);
};

if (cluster.isMaster) {

  IPC.registerMaster({
    add(params) { return params.reduce((a, b) => a + b, 0); },
    mul(params) { return params.reduce((a, b) => a * b, 1); },
    error() { throw new HeheError(); },
    exit(params) { process.exit(params); }
  });

  cluster.fork();

} else {

  const st = new SequenceTester([ true, true, true ]);

  st.then(() => {
    IPC.call('exit', 0);
  }, die);

  IPC.call('add', [ 5, 7, 12 ]).then(result => {
    st.assert(result === 24);
  }).catch(die);

  IPC.call('mul', [ 2, 3, 4 ]).then(result => {
    st.assert(result === 24);
  }).catch(die);

  IPC.call('error').catch(result => {
    st.assert(result.name === 'hehe');
  }).catch(die);

}
