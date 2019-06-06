/**
 * 客户端模式
 */
const alidns = require('./alidns.js');

const main = async (action, target) => {
    console.log('Action:' + action + ",Domain:" + target.hostname);
    if (action === "add") {
        await alidns.updateRecord(target);
    } else if (action === "delete") {
        await alidns.deleteRecord(target);
    } else {
        console.log("unknow action:" + action);
    }
    console.log('done!');
};

const run = () => {
    let action = "add";
    let hostname = "";
    let type = "A";
    let ip = "";
    if (process.argv.length > 4) {
        action = process.argv[2];
        hostname = process.argv[3];
        ip = process.argv[4];
    } else if (process.argv.length > 5) {
        action = process.argv[2];
        hostname = process.argv[3];
        ip = process.argv[4];
        type = process.argv[5];
    } else {
        console.log("Usage: app.js Clinet <add|delete> <hostname> <ip> [type]");
        return;
    }
    let target = {
        type: type,
        hostname: hostname,
        ip: ip,
        checkUpdate: true
    };
    main(action, target);
}
module.exports = {
    run: run
}