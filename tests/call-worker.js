const cluster = require('cluster');
const assert = require('assert');
const SequenceTester = require('sequence-tester');
const { call, register, registerMaster, broadcast, callWorker } = require('..');

if (cluster.isMaster) {

  let COUNT = 3;

  let st = new SequenceTester(Array.from({ length: COUNT }, () => true));

  registerMaster('init', () => st.assert(true));

  let exitedPids = [];
  registerMaster('feedback', pid => exitedPids.push(pid));

  st.then(() => {
    return broadcast('getPid');
  }).then(pids => {
    return callWorker(pids[0], 'kill', { pid: pids[1], status: 0 }).then(result => {
      return { result, killed: pids[1] };
    });
  }).then(({ result, killed }) => {
    assert.strictEqual(result, 'ok');
    assert.deepEqual([ killed ], exitedPids);
  }).then(() => process.exit(), console.error);

  for (let i = 0; i < COUNT; i++) cluster.fork();

}

call('init');

register('getPid', () => process.pid);

register('exit', status => {
  return call('feedback', process.pid).then(() => {
    setTimeout(() => {
      process.exit(status);
    });
    return 'ok';
  });
});

register('kill', ({ pid, status }) => {
  return callWorker(pid, 'exit', status);
});
