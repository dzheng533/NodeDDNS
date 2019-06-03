/**
 * let's E cert-auto 插件，用来实现自动添加DNS认证使用的TXT记录功能。
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

let certbotDomain = process.env.CERTBOT_DOMAIN;
let certbotvalidation = process.env.CERTBOT_VALIDATION;
let target = {
    type: "TXT",
    hostname: "_acme-challenge." + certbotDomain,
    ip: certbotvalidation,
    checkUpdate: false
};
let action = "add";
if (process.argv.length > 2) {
    action = process.argv[2];
}
main(action, target);