const cluster = require('cluster');
const assert = require('assert');
const SequenceTester = require('sequence-tester');
const { register, call, registerMaster, broadcast } = require('..');

register('getPid', () => process.pid);

call('ready');

if (cluster.isMaster) {

  const COUNT = 3;

  let answer = Array.from({ length: COUNT }, () => cluster.fork().process.pid).concat([ process.pid ]).sort();

  let st = new SequenceTester(Array.from({ length: COUNT + 1 }, () => true));

  st.then(() => broadcast('getPid')).then(result => {
    assert.deepEqual(result.sort(), answer);
    process.exit(0);
  }, error => {
    console.error(error);
    process.exit(1);
  });

  registerMaster('ready', () => {
    st.assert(true);
  });

}
