/**
 * 服务器模式，监听数据接口通过API调用修改
 */
const http = require('http');
const url = require('url');
const alidns = require('./alidns.js');
const config = require('./config.json');

// hostname 以 query string 形式传入, 格式为 xxx.xxx.xxx.example.com
// 以上 example.com 为域名，xxx.xxx.xxx 为子域名
// ip 如果在 query string 中出现, 则设定为该 ip, 否则设定为访问客户端的 ip
const getTarget = (req) => {
    return {
        hostname: url.parse(req.url, true).query.hostname,
        ip: url.parse(req.url, true).query.ip
            || req.headers[config.clientIpHeader.toLowerCase()]
            || req.connection.remoteAddress
            || req.socket.remoteAddress
            || req.connection.socket.remoteAddress
    };
};
const run = () => {
    // 服务器端监听
    http.createServer((req, res) => {
        req.on('error', err => {
            console.error(err);
            res.statusCode = 400;
            res.end();
        });
        res.on('error', err => {
            console.error(err);
        });
        if (req.method === 'GET') {
            if (url.parse(req.url, true).pathname === config.path) {
                const target = getTarget(req);
                if (!target.hostname) {
                    res.statusCode = 400;
                    res.end("hostname is required.");
                }
                alidns.updateRecord(target).then((msg) => {
                    if (msg === 'error') {
                        res.statusCode = 400;
                    } else if (typeof (msg) === "object") {
                        msg = "success.";
                    }
                    console.log(new Date() + ': [' + JSON.stringify(msg) + '] ' + JSON.stringify(target));
                    res.end(msg);
                }).catch((error) => {
                    console.log('Error: ' + error.message);
                    res.statusCode = 400;
                    res.end("error");
                });
            } else {
                let clientIp = req.headers[config.clientIpHeader.toLowerCase()]
                    || req.connection.remoteAddress
                    || req.socket.remoteAddress
                    || req.connection.socket.remoteAddress;
                res.statusCode = 200;
                res.end(clientIp);
            }
        } else {
            res.statusCode = 404;
            res.end();
        }
    }).listen(config.port);
}


module.exports = {
    run: run
}