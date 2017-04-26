const cluster = require('cluster');
const assert = require('assert');
const { call, registerMaster } = require('..');

if (cluster.isMaster) {

  registerMaster({

    sum(params) {
      return params.reduce((a, b) => a + b, 0);
    },

    wait(time) {
      return new Promise(resolve => {
        setTimeout(() => resolve(true), time);
      });
    },

    exit(code) {
      process.exit(code);
    }

  });

  cluster.fork();

} else {

  const c1 = call({ method: 'sum' }, [ 1, 2, 3, 4 ]).then(result => {
    assert.equal(result, 10);
  });

  const c2 = call({ method: 'wait', timeout: 3000}, 1000).then(result => {
    assert.equal(result, true);
  });

  const c3 = call({ method: 'wait', timeout: 1000}, 2000).then(result => {
    assert.equal(result, true);
  }).catch(err => {
    assert.equal(err.name, 'SOCKET_IPC_CALL_TIMEOUT');
  });

  Promise.all([c1, c2, c3]).then(() => {
    call('exit', 0);
  }).catch(err => {
    console.log(err);
    call('exit', 1);
  });
}
