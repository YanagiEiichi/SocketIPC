const cluster = require('cluster');
const assert = require('assert');
const { call, registerMaster } = require('..');

class HeheError extends Error {
  constructor() {
    super('hehe error');
    this.otherProperty = 'other';
  }
}
Object.defineProperty(HeheError.prototype, 'name', { value: 'HEHE', enumerable: false, configurable: true });
Object.defineProperty(HeheError.prototype, 'status', { value: 233, enumerable: false, configurable: true });

if (cluster.isMaster) {

  registerMaster('hehe', () => {
    throw new HeheError();
  });

  registerMaster('exit', code => process.exit(code));

  cluster.fork();

} else {

  call('hehe').then(() => {
    throw new Error('what the fuck?');
  }, error => {
    assert.deepEqual({ name: 'HEHE', message: 'hehe error', status: 233, otherProperty: 'other' }, error);
  }).then(() => {
    call('exit', 0);
  }, error => {
    console.error(error);
    call('exit', 1);
  });

}
