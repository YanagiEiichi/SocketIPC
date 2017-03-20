const cluster = require('cluster');
const assert = require('assert');
const SequenceTester = require('sequence-tester');
const { call, register, registerMaster, broadcast, broadcastIgnoreSelf } = require('..');

if (cluster.isMaster) {

  let COUNT = 3;

  let st = new SequenceTester(Array.from({ length: COUNT + 1 }));

  registerMaster('init', () => st.assert());

  st.then(() => {
    return broadcast('test');
  }).then(resutls => {
    assert.deepEqual(Array.from({ length: COUNT + 1 }, () => true), resutls);
  }).then(() => {
    process.exit();
  }, console.error);

  for (let i = 0; i < COUNT; i++) cluster.fork();

}

register('test', () => {
  return broadcastIgnoreSelf('getPid').then(pids => {
    return !~pids.indexOf(process.pid);
  });
});

register('getPid', () => process.pid);

call('init');
