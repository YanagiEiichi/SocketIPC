const cluster = require('cluster');
const assert = require('assert');
const { call, registerMaster, callWithTimeout } = require('..');

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

  const c1 = call('wait', 6000).then(result => {
    assert.equal(result, true);
  });

  const c2 = callWithTimeout('wait', 1000, 3000).then(result => {
    assert.equal(result, true);
  });

  const c3 = callWithTimeout('wait', 2000, 1000).then(result => {
    assert.equal(result, true);
  }).catch(err => {
    assert.equal(err.name, 'SOCKET_IPC_TIMEOUT');
  });

  Promise.all([c1, c2, c3]).then(() => {
    call('exit', 0);
  }).catch(err => {
    console.log(err);
    call('exit', 1);
  });
}
