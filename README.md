# SocketIPC

Implements IPC with Socket on cluster mode

### Demo

```js
const cluster = require('cluster');
const assert = require('assert');
const SocketIPC = require('../SocketIPC');

if (cluster.isMaster) {
  SocketIPC.registerMaster({
    sum(params) {
      return params.reduce((a, b) => a + b, 0);
    },
    exit(code) {
      process.exit(code);
    }
  });
  cluster.fork();
} else {
  SocketIPC.call('sum', [ 1, 2, 3, 4 ]).then(result => {
    assert.equal(result, 10);
    SocketIPC.call('exit', 0);
  }).catch(error => {
    console.error(error);
    SocketIPC.call('exit', 1);
  });
}
```
