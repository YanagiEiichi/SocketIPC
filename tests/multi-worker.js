const cluster = require('cluster');
const { broadcast, registerMaster, register, call } = require('..');
const SequenceTester = require('sequence-tester');

const die = (error) => {
  console.error(error);
  process.exit(1);
};

if (cluster.isMaster) {

  const TEST_COUNT = 24;

  const allWorkerReady = new SequenceTester(Array.from({ length: TEST_COUNT }, () => true));
  const allWorkerExited = new SequenceTester(Array.from({ length: TEST_COUNT }, () => true));

  allWorkerReady.then(() => {
    broadcast('exit').catch(() => { /* ignore error */ });
  }).catch(die);

  allWorkerExited.then(() => {
    process.exit(0);
  }).catch(die);

  registerMaster('workerExited', () => allWorkerExited.assert(true));

  registerMaster('workerReady', () => allWorkerReady.assert(true));

  for (let i = 0; i < TEST_COUNT; i++) cluster.fork();

} else {

  register({
    exit() {
      call('workerExited').catch(die);
      process.nextTick(() => process.exit(0));
    }
  });

  call('workerReady').catch(die);

}
