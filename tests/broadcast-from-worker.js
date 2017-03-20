const cluster = require('cluster');
const SequenceTester = require('sequence-tester');
const IPC = require('..');

const die = error => {
  console.error(error);
  IPC.call('exit', 1);
};

IPC.register('getPid', () => process.pid);

IPC.register('allWorkersReady', () => {
  IPC.broadcast('getPid').then(pids => {
    pids.sort();
    IPC.call('feedback', { pids });
  }).catch(die);
});

IPC.call('ready');

if (cluster.isMaster) {

  const COUNT = 3;
  const allWorkersReadyTester = new SequenceTester(Array.from({ length: COUNT + 1 }));

  allWorkersReadyTester.then(() => IPC.broadcast('allWorkersReady'));
  IPC.registerMaster('ready', () => allWorkersReadyTester.assert());

  let pids = Array.from({ length: COUNT }, () => cluster.fork().process.pid);
  pids.push(process.pid);
  const answer = JSON.stringify(pids.sort());

  const resultTester = new SequenceTester(Array.from({ length: COUNT + 1 }, () => answer));
  resultTester.then(() => {
    process.exit(0);
  }, die);

  IPC.registerMaster('feedback', ({ pids }) => {
    resultTester.assert(JSON.stringify(pids));
  });

}
