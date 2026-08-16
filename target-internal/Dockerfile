FROM ubuntu:26.04

ENV DEBIAN_FRONTEND=noninteractive

# 教務內網管理主機（漏洞4的橫向移動目標）
# 只監聽SSH，沒有對外服務——攻擊機打不到，只能從target-box內部pivot過來
RUN apt-get update && apt-get install -y --no-install-recommends \
        openssh-server sudo vim nano less grep findutils procps \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/run/sshd

# 對應db/seed.sql裡internal_hosts表的憑證（host, ssh_user, ssh_password）
RUN useradd -m -s /bin/bash admin \
    && echo "admin:InternalAdm1n!23" | chpasswd \
    && usermod -aG sudo admin

# 成功橫向移動的證明
RUN mkdir -p /opt/registrar \
    && printf 'FLAG{lateral_movement_via_leaked_db_creds}\n' > /opt/registrar/flag06.txt \
    && printf '教務系統選課開放/關閉管理\n（此為橫向移動證明用途，內容非重點）\n' > /opt/registrar/course_admin_panel.txt \
    && chown -R admin:admin /opt/registrar

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
