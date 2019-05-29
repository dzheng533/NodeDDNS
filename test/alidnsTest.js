const aliDns = require("../alidns");
let param = { "subDomain": "test.myddns.club" };
/*
aliDns.describeSubDomainRecords(param).then((result) => {
    console.log(JSON.stringify(result));
}).catch((exception) => {
    console.error("exception:" + exception.message);
});

aliDns.updateRecord({
    hostname: "test.myddns.club",
    ip: "8.8.8.12",
    type: "A"
}).then((result) => {
    console.log(JSON.stringify(result));
});
*/
aliDns.deleteRecord({ "hostname": "test.myddns.club" }).then((result) => {
    console.log(JSON.stringify(result));
});