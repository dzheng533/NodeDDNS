'use strict';
const http = require('http');

const aliDns = require("../alidns");
let param = { "subDomain": "test.myddns.club" };

const sendAPIRequest = (parameter) => {
    return new Promise((resolve, reject) => {
        http.request(parameter, res => {
            let body = [];
            res.on('data', chunk => body.push(chunk))
                .on('end', () => {
                    try {
                        body = Buffer.concat(body).toString();
                        const result = body;
                        if (res.statusCode === 200) {
                            resolve(result);
                        } else {
                            reject(result);
                        }
                    } catch (except) {
                        reject(except);
                    }
                });
        }).on('error', (error) => {
            console.error("sendAPIRequest error:" + error.message);
            reject(error);
        }).end();
    })
}

sendAPIRequest({ 'host': 'api.ip.la', 'port': 80, 'path': '/' }).then((ip) => { console.log("IP:" + ip) }).catch((error) => {
    console.error(error);
});
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

aliDns.deleteRecord({ "hostname": "test.myddns.club" }).then((result) => {
    console.log(JSON.stringify(result));
});*/
