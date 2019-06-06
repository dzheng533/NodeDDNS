# NodeDDNS

利用阿里云解析的 API 实现域名管理功能。使用场景主要是拨号上网没有固定IP地址的环境自当完成IP地址的更新。
支持增加 A 记录以外的数据类型。比如 CNAME、TXT等。
新增Let’s Encrypt 插件模式完成通配符证书签发。

没有任何 npm 依赖, 用到的原生 Node.js 模块有:

- https
- url
- crypto

## 使用场景

- 服务器模式：部署本服务在云服务器上，在本地的路由器、PC或树莓派等设备上设定定时任务，访问服务端接口。服务端接口接收到请求后更新DNS上的设置。
- 客户端模式：在本地可以执行node程序的设备上设定定时任务，定时执行更新DNS设置。
- Certauto 插件模式。将本程序与certauto上传到需要获取证书的服务器，执行时通过参数指定本插件实现自动签发证书。

## 使用限制

- 目前只能支持域名的NS服务器是阿里云的DNS。两种情况，第一：阿里云注册管理的域名；第二：解析服务器设置为阿里云。
 如果要将 IP 设置为客户端所在的公网 IP, 要确保客户端被当地 ISP 分配的不是大内网的 IP（如果是大内网的 IP, 可以给客服打电话要求更换）
 
## 服务器端模式部署

1. 复制 config-sample.json 并命名为 config.json
2. 修改 config.json 中的内容, 参数说明见下面
3. 用 pm2 或其他方式启动 app.js，启动时传递参数 “Server”
4. 进行必要的网路配置（譬如 Nginx 反向代理, 防火墙等）, 确保应用服务能在公网中被访问到

## 客户端模式使用
1. 复制 config-sample.json 并命名为 config.json
2. 修改 config.json 中的内容, 参数说明见下面
3. 使用node app.js 启动程序，启动时传递参数
~~~
用例 ：
node app.js Clinet <add|delete> <hostname> <ip> [type]
add 表示添加或更新
delete 表示删除
hostname 为要添加修改的完成域名。例如 test.example.com
ip 表示 A 记录的ip地址，CNAME记录的 域名等
type 表示记录类型，A、CNAME、TXT等。默认是 A。
~~~

## Certauto插件使用模式
配合certauto申请SSL证书时通过参数使用，下载本项目到certbot-auto脚本同一个目录下，执行下面命令。详细使用说明参考这里 [Let's Encrypt 通配符证书申请-更新](https://ehangsoft.cn/2019/06/05/Let-s-Encrypt-%E9%80%9A%E9%85%8D%E7%AC%A6%E8%AF%81%E4%B9%A6%E7%94%B3%E8%AF%B7-%E6%9B%B4%E6%96%B0/)
申请新证书
~~~
sudo ./certbot-auto  certonly --email <email> -d <domain>  --manual --manual-auth-hook "/apps/server/nodejs/bin/node cert-manual-hook.js add" --manual-cleanup-hook "/apps/server/nodejs/bin/node cert-manual-hook.js delete" --preferred-challenges dns  --manual-public-ip-logging-ok 
~~~
重新申请
~~~
sudo ./certbot-auto  renew --manual-auth-hook "/apps/server/nodejs/bin/node ddns.js add" --manual-cleanup-hook "/apps/server/nodejs/bin/node ddns.js delete"
~~~

## config.json 参数说明

- AccessKeyId 和 AccessKeySecret 在阿里云的控制台获取, 注意保密
- clientIpHeader 属性和反向代理有关（例如在 Nginx 后面）, 用于从 header 中获取客户端的 IP
- path 是自定义的访问路径, 默认为 `/hack`
- port 是自定义的服务器端监听的端口

## 客户端手动调用

调用的原理和花生壳类似, 假设在 config.json 中 `path` 属性是默认的 `/hack`, 有两种调用方法:

1. 在客户端调用 `/hack?hostname=foo.bar.com` 来设定 `foo.bar.com` 解析为当前客户端的公网 IP
2. 在客户端调用 `/hack?hostname=foo.bar.com&ip=xxx.xxx.xxx.xxx` 来设定 `foo.bar.com` 解析为 `xxx.xxx.xxx.xxx`

## 客户端 crontab 定时调用

1. 参照 client.sh 写个 shell script
2. 让脚本可运行: `chmod 775 client.sh`
3. 编辑 crontab: `crontab -e`
4. 添加记录, 让脚本 5 分钟调用一次: `0,5,10,15,20,25,30,35,40,45,50,55 * * * * /path/to/client.sh`
5. 重启 cron 服务: `sudo service cron restart`

## 安全事项

由于本服务的 API 未加任何身份验证措施，相当于是把阿里云解析的修改、添加 API 暴露在了外界，所以一定要注意入口地址的隐藏。
