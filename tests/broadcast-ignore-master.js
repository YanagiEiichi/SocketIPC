const cluster = require('cluster');
const assert = require('assert');
const SequenceTester = require('sequence-tester');
const { call, register, registerMaster, broadcastIgnoreMaster } = require('..');

if (cluster.isMaster) {

  let COUNT = 3;

  let st = new SequenceTester(Array.from({ length: COUNT + 1 }));

  registerMaster('init', () => st.assert());

  st.then(() => {
    return broadcastIgnoreMaster('getPid');
  }).then(pids => {
    assert(!~pids.indexOf(process.pid));
  }).then(() => {
    process.exit();
  }, console.error);

  for (let i = 0; i < COUNT; i++) cluster.fork();

} else {

  register('getPid', () => process.pid);

}

call('init');
