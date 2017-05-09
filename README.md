# SocketIPC

Implements IPC with Socket on cluster mode.

## Usage

### Method: SocketIPC.register(name, handler)

Register an IPC method to current worker.

* **name** `<String>` The IPC method name
* **handler** `<Function>` The handler function

In the handler funciton, you will recevied a params that may be passed from any "call", and you can also return a value as calling result.

```js
SocketIPC.register('pow', params => {
  return Math.pow(params.a, params.b);
});
```

### Method: SocketIPC.setAlias(alias)

Set alias for current worker.

* **alias** `<String>` the alias of current worker.

```js
SocketIPC.setAlias('deamon');
```

### Method: SocketIPC.callWorker(pid, name, params)

Call an IPC method on a specified worker and receive asynchronously a result with Promise.

* **pid** `<Number>` Target worker pid
* **name** `<String>` The IPC method name
* **params** `<Any>` The calling params

```js
SocketIPC.callPid(1234, 'getMasterPid', null).then(result => {
  // ...
});
```

### Method: SocketIPC.callAlias(alias, name, params)

Call an IPC method on specified named workers, and receive asynchronously the result array with Promise.

* **alias** `<String>` Target worker alias
* **name** `<String>` The IPC method name
* **params** `<Any>` The calling params

```js
SocketIPC.callAlias('deamon', resultList => {
  // ...
});
```

### Method: SocketIPC.broadcast(name, params)

* **name** `<String>` The IPC method name
* **params** `<Any>` The calling params

Broadcast to all workers.

```js
SocketIPC.broadcast('getMasterPid', null).then(resultList => {
  // ...
});
```

### Method: SocketIPC.broadcastIgnoreSelf(name, params)

* **name** `<String>` The IPC method name
* **params** `<Any>` The calling params

Broadcast to all workers but ignore self.

```js
SocketIPC.broadcastIgnoreSelf('getMasterPid', null).then(resultList => {
  // ...
});
```

### Method: SocketIPC.broadcastIgnoreMaster(name, params)

* **name** `<String>` The IPC method name
* **params** `<Any>` The calling params

Broadcast to all workers but ignore master.

```js
SocketIPC.broadcastIgnoreSelf('getMasterPid', null).then(resultList => {
  // ...
});
```

## Example

```js
const cluster = require('cluster');
const assert = require('assert');
const SocketIPC = require('.');

if (cluster.isMaster) {

  SocketIPC.register('sum', params => {
    return params.reduce((a, b) => a + b, 0);
  });

  SocketIPC.register('exit', code => {
    process.exit(code);
  });

  SocketIPC.setAlias('master');

  cluster.fork();

} else {

  SocketIPC.callAlias('master', 'sum', [ 1, 2, 3, 4 ]).then(result => {
    assert.equal(result, 10);
    SocketIPC.callAlias('master', 'exit', 0);
  }).catch(error => {
    console.error(error);
    SocketIPC.callAlias('master', 'exit', 1);
  });

}
```
