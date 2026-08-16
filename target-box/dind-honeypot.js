#!/usr/bin/env node
// 隱藏關卡7：曝露的 docker socket —— honeypot（假 daemon）版
//
// 這不是真的 Docker-in-Docker，起不了容器、也逃不到真正的 host。它存在的唯一目的是
// 重現「容器內曝露了一個 docker socket」這個漏洞，讓關卡在只交付 target-box 一個 image
// 的前提下成立，不必額外掛一個 DinD 沙盒容器（原本的 target-dind），也不必平台配線。
//
//   - 回答 /_ping、/version、/info，讓 `docker -H unix:///var/run/dind/docker.sock version`
//     成功 —— scoring-engine/checker.py 就是靠這個 version 呼叫判定漏洞還在不在
//   - flag 放在 /info 的 Warnings（`docker -H … info` 直接看得到）與 /flag（curl 取得）
//
// socket 設 root:root 0660，user1 摸不到 —— 紅隊得先靠關卡3或5 拿到容器內 root 才碰得到。
// 藍隊修補：`rm -f /var/run/dind/docker.sock`。本行程不會自己重建 socket，移除即生效。
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const SOCK = '/var/run/dind/docker.sock';
const FLAG = 'FLAG{container_escape_via_exposed_docker_socket}';
const API_HEADERS = { 'Api-Version': '1.45', 'Docker-Experimental': 'false' };

fs.mkdirSync(path.dirname(SOCK), { recursive: true });
try { fs.unlinkSync(SOCK); } catch (e) { /* 不存在就算了 */ }

function sendJson(res, code, obj) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, API_HEADERS));
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const url = (req.url || '').split('?')[0];

  // 版本協商：docker CLI 先打 /_ping 讀 Api-Version 標頭，再用該版本打後續請求。
  if (url.endsWith('/_ping')) {
    res.writeHead(200, Object.assign({ 'Content-Type': 'text/plain' }, API_HEADERS));
    res.end(req.method === 'HEAD' ? undefined : 'OK');
    return;
  }

  // `docker version` 靠這個回應才會 exit 0（checker 的判定式）。
  if (url.endsWith('/version')) {
    return sendJson(res, 200, {
      Platform: { Name: 'Docker Engine - Community' },
      Version: '27.0.0', ApiVersion: '1.45', MinAPIVersion: '1.24',
      GitCommit: '0000000', GoVersion: 'go1.21',
      Os: 'linux', Arch: 'amd64', KernelVersion: '6.0.0',
      BuildTime: '2026-01-01T00:00:00.000000000+00:00'
    });
  }

  // `docker info` 會把 Warnings 印成 WARNING: 行 —— flag 藏在這裡。
  if (url.endsWith('/info')) {
    return sendJson(res, 200, {
      ID: 'HONEY:P0T0:SAND:B0XX:FAKE:DIND:0000:0000:0000:0000:0000:0000',
      Name: 'dind-sandbox', ServerVersion: '27.0.0',
      OperatingSystem: 'Alpine Linux', OSType: 'linux', Architecture: 'x86_64',
      NCPU: 1, MemTotal: 536870912, Containers: 0, Images: 0,
      Warnings: [FLAG]
    });
  }

  // 給用 curl --unix-socket 直接探 socket 的人一條乾脆的路徑。
  if (url.endsWith('/flag')) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(FLAG + '\n');
    return;
  }

  return sendJson(res, 404, { message: 'page not found' });
});

server.on('error', (err) => {
  console.error('[dind-honeypot] error:', err.message);
  process.exit(1);
});

server.listen(SOCK, () => {
  // root 執行 → socket 預設 root:root；再收成 0660，擋掉 user1 等非 root 帳號。
  try { fs.chmodSync(SOCK, 0o660); } catch (e) { console.error('[dind-honeypot] chmod:', e.message); }
  console.log('[dind-honeypot] listening on ' + SOCK + ' (root:root 0660)');
});
