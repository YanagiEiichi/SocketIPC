const cluster = require('cluster');
const IPC = require('..');
const SequenceTester = require('sequence-tester');

if (cluster.isMaster) {

  const TEST_COUNT = 24;

  const allWorkerReady = new SequenceTester(Array.from({ length: TEST_COUNT }, () => true));
  const allWorkerExited = new SequenceTester(Array.from({ length: TEST_COUNT }, () => true));

  const die = (error) => {
    console.error(error);
    process.exit();
  };

  allWorkerReady.then(() => {
    IPC.broadcast('exit');
  }).catch(die);

  allWorkerExited.then(() => {
    process.exit(0);
  }).catch(die);

  IPC.registerMaster('workerExited', () => allWorkerExited.assert(true));

  IPC.registerMaster('workerReady', () => allWorkerReady.assert(true));

  for (let i = 0; i < TEST_COUNT; i++) cluster.fork();

} else {

  IPC.register({
    exit() {
      IPC.call('workerExited');
      process.nextTick(() => process.exit(0));
    }
  });

  IPC.call('workerReady');

}
