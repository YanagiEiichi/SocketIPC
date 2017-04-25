const cluster = require('cluster');
const assert = require('assert');
const SequenceTester = require('sequence-tester');
const { call, register, registerMaster, broadcast, callWorker } = require('..');
const { setAlias, callAlias, ready } = require('..');

const workerAlias = 'worker'
let COUNT = 3;

if (cluster.isMaster) {
  try {
    setAlias('test')
  } catch (e) {
    assert(e.name, 'SOCKET_IPC_PID_NOT_FOUND')
  }

  callAlias(workerAlias, 'ok').catch(err => {
    assert(err.name, 'SOCKET_IPC_ALIAS_NOT_FOUND_ERROR')
  })

  ready().then(() => {
    setAlias('master').then(result => assert.equal(result, true));

    try {
      setAlias('error')
    } catch (e) {
      assert(e.name, 'SOCKET_IPC_ALREADY_ALIAS_ERROR')
    }

    let stInit = new SequenceTester(Array.from({ length: COUNT }, () => true));

    registerMaster('init', () => stInit.assert(true));


    stInit.then(() => {
      return callAlias(workerAlias, 'ok');
    }).then((result) => {
      assert.deepEqual(result, Array.from({ length: COUNT }, () => 'ok'));
    }).then(() => {
      return new Promise((resolve, reject) => {
        workers[0].kill();
        workers[0].on('exit', () => {
          resolve();
        });
      });
    }).then(() => {
      return callAlias(workerAlias, 'ok');
    }).then((result) => {
      return assert.deepEqual(result, Array.from({ length: COUNT - 1 }, () => 'ok'));
    }).then(() => process.exit(), console.error);

  });
  const workers = [];
  for (let i = 0; i < COUNT; i++) {
    workers.push(cluster.fork());
  }
} else {
  register('ok', () => {
    return Promise.resolve('ok')
  });

  let st2 = new SequenceTester(Array.from({ length: COUNT }, () => true));

  ready().then(() => {
    setAlias('worker').then(results => {
      call('init');
      assert.equal(results, true);
    });
  })
}
