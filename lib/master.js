const cluster = require('cluster');

if (cluster.isMaster) {

  const net = require('net');
  const Connection = require('./connection');
  const { buildChains } = require('./utils');
  const storage = new Set();

  const __init = buildChains(function() {
    storage.add(this);
    this.socket.on('error', () => {
      this.socket.destroy();
      storage.delete(this);
    });
    this.socket.on('close', () => storage.delete(this));
  });

  const __broadcast = buildChains(function({ args }) {
    let results = Array.from(storage, item => item.call(...args));
    let all = Promise.all(results);
    results.then = (...args) => all.then(...args);
    results.catch = (...args) => all.catch(...args);
    return results;
  });

  const __registerMaster = buildChains(function({ name, handlers }) {
    table[name] = buildChains(...[].concat(handlers));
  });

  let table = { __init, __broadcast, __registerMaster };

  let server = net.createServer(socket => {
    void new Connection(socket, table);
  }).listen();

  server.unref();

  process.env.SOCKETIPC_ADDRESS = JSON.stringify(server.address());

  module.exports = table;

} else {

  module.exports = null;

}
