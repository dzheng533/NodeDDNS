'use strict';
const http = require('http');
const config = require('./config.json');
const crypto = require('crypto');

const ALIDNS_HOST = 'alidns.aliyuncs.com';
const HTTP_METHOD = "GET";

const ACTION_DESCRIBE_SUBDOMAIN = "DescribeSubDomainRecords";
const ACTION_ADD = "AddDomainRecord";
const ACTION_UPDATE = "UpdateDomainRecord";
const ACTION_DELETE = "DeleteDomainRecord";

// 参考: https://help.aliyun.com/document_detail/dns/api-reference/call-method/common-parameters.html?spm=5176.docdns/api-reference/call-method/request.6.129.DHgQI9
// 以下三个参数需要程序生成: Signature, Timestamp, SignatureNonce
const commonParams = {
  Format: 'JSON',
  Version: '2015-01-09',
  AccessKeyId: config.AccessKeyId,
  SignatureMethod: 'HMAC-SHA1',
  SignatureVersion: '1.0'
};

// 用于给 SignatureNonce 产生随机数
const getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 将请求的参数和公共参数合并
const getCombinedParams = function (reqParams) {
  const combinedParams = {};
  Object.keys(reqParams).forEach((x) => {
    combinedParams[x] = reqParams[x];
  });
  Object.keys(commonParams).forEach((x) => {
    combinedParams[x] = commonParams[x];
  });
  const timestamp = new Date();
  combinedParams["Timestamp"] = timestamp.toISOString();
  combinedParams["SignatureNonce"] = getRandomInt(100000000, 1000000000 - 1);
  return combinedParams;
};

// 按照阿里的规则进行编码
// 参照: https://help.aliyun.com/document_detail/dns/api-reference/call-method/signature.html?spm=5176.docdns/api-reference/call-method/common-parameters.2.1.k7KttX
const percentEncode = function (x) {
  // JavaScript 的 encodeURIComponent 规则: encodeURIComponent escapes all characters except the following: alphabetic, decimal digits, - _ . ! ~ * ' ( )
  // 阿里云要求的规则: 对于字符 A-Z、a-z、0-9以及字符“-”、“_”、“.”、“~”不编码; 把编码后的字符串中加号（+）替换成%20、星号（*）替换成%2A、%7E替换回波浪号（~）
  // 因此需要手动处理的有: ! * ' ( )
  // 这里可能会有潜在的问题, 因为阿里的示例代码是 Java 写的, Java 的 URLEncoder 规则和 JavaScript 的 encodeURIComponent 规则有些差别
  return encodeURIComponent(x)
    .replace("!", "%21")
    .replace("'", "%27")
    .replace("(", "%28")
    .replace(")", "%29")
    .replace("+", "%20")
    .replace("*", "%2A")
    .replace("%7E", "~");
};

// 参考: https://help.aliyun.com/document_detail/dns/api-reference/call-method/signature.html?spm=5176.docdns/api-reference/call-method/common-parameters.2.1.3RYnvO
// 注意这里的 key 和 value 都需要进行编码
const convertJsonToQueryString = function (params) {
  return Object.keys(params)
    .sort()
    .map(x => percentEncode(x) + "=" + percentEncode(params[x]))
    .join("&");
};

// 注意这里的 canonicalizedQueryString 中的 K-V 对实际上会经过两次编码, 因为之前在构造 query string 时就编码过一次了
const getStringToSign = function (canonicalizedQueryString) {
  return HTTP_METHOD + '&' + percentEncode('/') + '&' + percentEncode(canonicalizedQueryString);
};

// 整合所有步骤
// 输入是待请求的参数（不包括公共参数）
// 输出是请求字符串（经过整合公共参数, 编码和签名, 可以直接使用）
const getQueryString = function (reqParams) {
  const combinedParams = getCombinedParams(reqParams);
  let canonicalizedQueryString = convertJsonToQueryString(combinedParams);
  const stringToSign = getStringToSign(canonicalizedQueryString);
  const hmac = crypto.createHmac('sha1', config.AccessKeySecret + '&');
  hmac.update(stringToSign);
  const Signature = hmac.digest('base64');
  canonicalizedQueryString += '&Signature=' + percentEncode(Signature);
  return canonicalizedQueryString;
};

const getPath = function (reqParams) {
  return '/?' + getQueryString(reqParams);
}

/**
 * 发送API请求
 * @param {
      host: ALIDNS_HOST,
      path: getPath(describeSubParams)
    } parameter
 */
const sendAPIRequest = (parameter) => {
  return new Promise((resolve, reject) => {
    http.request(parameter, res => {
      let body = [];
      res.on('data', chunk => body.push(chunk))
        .on('end', () => {
          try {
            body = Buffer.concat(body).toString();
            const result = JSON.parse(body);
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

/**
 * 查询域名的子域名列表
 * @param {
 *    "subDomain":"example.com"
 * } parameter 
 */
const describeSubDomainRecords = (parameter) => {
  return new Promise((resolve, reject) => {
    const describeSubParams = {
      Action: ACTION_DESCRIBE_SUBDOMAIN,
      SubDomain: parameter.subDomain
    };
    sendAPIRequest({
      host: ALIDNS_HOST,
      path: getPath(describeSubParams)
    }).then((result) => {
      //返回查询结果
      resolve(result);
    }).catch((exception) => {
      //不处理异常，抛出去
      reject(exception);
      console.error("exception:" + exception.message);
    });
  });
}

// 这段代码首先会检查已有的记录
// 如果记录不存在, 会新建一个解析, 并返回 created
// 如果记录存在, ip 没变化, 不会更新 ip, 并返回 nochg
// 如果记录存在, ip 有变化, 会更新 ip, 并返回 updated
// 如果阿里云端返回 400 错误, 则返回 error

const updateRecord = (target) => {
  return new Promise((resolve, reject) => {
    const value = target.ip;
    const subDomain = target.hostname;
    let checkUpdate = typeof (target.checkUpdate) === "undefined" ? true : (target.checkUpdate == true ? true : false);
    const domainName = subDomain.split('.').slice(-2).join('.');
    const rr = subDomain.split('.').slice(0, -2).join('.');
    const type = target.type ? target.type : "A";

    const updateParmas = {
      Action: ACTION_UPDATE,
      RecordId: '',
      RR: rr,
      Type: type,
      Value: value
    };
    const addParmas = {
      Action: ACTION_ADD,
      DomainName: domainName,
      RR: rr,
      Type: type,
      Value: value
    };

    //查询是否存在记录
    describeSubDomainRecords({
      "subDomain": subDomain
    }).then((result) => {
      let shouldUpdate = false;
      let shouldAdd = true;
      if (checkUpdate) {
        result.DomainRecords.Record
          .filter(record => record.RR === updateParmas.RR)
          .forEach(record => {
            shouldAdd = false;
            if (record.Value !== updateParmas.Value) {
              shouldUpdate = true;
              updateParmas.RecordId = record.RecordId;
            }
          });
      }
      //更新或新增数据
      if (shouldUpdate) {
        // 更新域名的解析
        sendAPIRequest({
          host: ALIDNS_HOST,
          path: getPath(updateParmas)
        }).then((result) => {
          resolve(result);
        }).catch((exception) => { resolve(exception); });
      } else if (shouldAdd) {
        // 增加新的域名解析
        sendAPIRequest({
          host: ALIDNS_HOST,
          path: getPath(addParmas)
        }).then((result) => {
          resolve(result);
        }).catch((exception) => { resolve(exception); });
      } else {
        resolve('nochg');
      }
    }).catch((exception) => {
      //吞掉异常
      resolve(exception);
    });
  });
};

const deleteRecord = (target) => {
  return new Promise((resolve, reject) => {
    const subDomain = target.hostname;
    const rr = subDomain.split('.').slice(0, -2).join('.');
    const deleteParmas = {
      Action: ACTION_DELETE,
      RR: rr,
      RecordId: ''
    };
    // 首先获取域名信息, 目的是获取要更新的域名的 RecordId

    //查询是否存在记录
    describeSubDomainRecords({
      "subDomain": subDomain
    }).then((result) => {
      // 获取是否有域名的 RecordId, 如果有可以删除，如果没有则不删除。
      let foundRecord = false;
      result.DomainRecords.Record
        .filter(record => record.RR === deleteParmas.RR)
        .forEach(record => {
          foundRecord = false;
          if (record.Value !== deleteParmas.Value) {
            foundRecord = true;
            deleteParmas.RecordId = record.RecordId;
          }
        });
      if (foundRecord) {
        // 删除域名的解析
        sendAPIRequest({
          host: ALIDNS_HOST,
          path: getPath(deleteParmas)
        }).then((result) => {
          resolve(result);
        }).catch((exception) => { resolve(exception); });
      } else {
        resolve('not found');
      }
    }).catch((exception) => { resolve(exception); });
  });
}
// 模块化
module.exports = {
  updateRecord: updateRecord,
  deleteRecord: deleteRecord,
  describeSubDomainRecords: describeSubDomainRecords
};