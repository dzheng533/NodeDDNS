# aliyun-ddns

利用阿里云解析的 API 实现动态域名解析的功能（类似花生壳）.

没有任何 npm 依赖, 用到的原生的 Node.js 模块有:

- http
- url
- crypto

## 使用前提

- 域名是由阿里云/万网托管的
-

## 服务器端程序部署

1. 填写 config-sample.json 中的内容
2. 将 config-sample.json 重命名为 config.json
3. 用 pm2 或其他方式启动 app.js
4. 进行必要的网路配置（譬如 Nginx 反向代理, 防火墙等）, 确保能在公网中被访问到

## config.json 参数说明

- AccessKeyId 和 AccessKeySecret 在阿里云的控制台获取, 注意保密
- clientIpHeader 属性和反向代理有关（例如在 Nginx 后面）, 用于从 header 中获取客户端的 IP
- path 是自定义的访问路径, 默认为 `/hack`
- port 是自定义的服务器端监听的端口

## 客户端调用

调用的原理和花生壳类似, 有两种调用方法:

1. 在客户端调用 `/hack?hostname=foo.bar.com` 来设定 `foo.bar.com` 解析为当前客户端的公网 IP
2. 在客户端调用 `/hack?hostname=foo.bar.com&ip=xxx.xxx.xxx.xxx` 来设定 `foo.bar.com` 解析为 `xxx.xxx.xxx.xxx`
