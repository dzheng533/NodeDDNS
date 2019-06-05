'use strict';
const process = require('process');
const server = require('./server');
const client = require('./client');

//运行模式，支持Server和Client模式，默认是Server模式
let runMode = "Server";

if (process.argv.length > 2) {
  runMode = process.argv[2];
}
if (runMode === "Server") {
  console.log("Running in server mode.");
  server.run();
} else if (runMode === "Client") {
  console.log("Running in client mode.");
  client.run();
} else {
  console.log("Only support \"Server\" or \"Client\" mode.");
}
