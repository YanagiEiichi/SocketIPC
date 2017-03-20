const assert = require('assert');
const { callWorker } = require('..');

callWorker(0, 'hehe').then(() => {
  throw new Error('must be throw');
}, error => {
  assert.deepEqual(error, {
    name: 'SOCKET_IPC_PID_NOT_FOUND',
    status: 400,
    message: 'PID not found in SocketIPC'
  });
  process.exit(0);
}).catch(error => {
  console.error(error);
  process.exit(1);
});
