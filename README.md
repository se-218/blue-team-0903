# blue-team-0903 — Metis 藍隊靶機 image 原始碼

Metis 校務門戶攻防演練，**藍隊交付的兩個靶機 image 的 build 原始碼**。
image 由 Docker Hub 交付、不放主 repo；主 repo [`se-218/Metis`](https://github.com/se-218/Metis)
只保留計分引擎（`blue/scoring-engine/`）與文件。

## 兩個 image

| image | 角色 | 內容 |
|---|---|---|
| `target-box` | **blue-a**（對外，紅隊打得到） | nginx + MySQL + 3 個 Node 服務。關卡 1–7 全埋在 image 裡（含隱藏關卡 7 的 docker socket honeypot） |
| `target-internal` | **blue-b**（對內，只有內網連得到） | 只有 sshd 的內網主機，藏橫向移動 flag |

## 關卡一覽（滿分 140）

| # | 關卡 | 修法 |
|---|---|---|
| 1 | `.env` 權限 777 洩漏 MySQL root 密碼 | `chmod 600` |
| 2 | `/etc/shadow` 644 可讀 | `chmod 600` |
| 3 | sudoers 讓 `user1` 免密碼 `sudo vim` 提權 | 移除 NOPASSWD 權限 |
| 4 | DB 明文內網 SSH 憑證 → 橫向移動到 `target-internal` | 清 `internal_hosts` 資料表 |
| 5 | backup 腳本 777 + root cron 每分鐘跑 | 收緊 owner/權限 |
| 6（隱藏） | webshell 攻擊軌跡鑑識 + IP 圍堵 | 分析 log、`iptables` 封鎖 |
| 7（隱藏） | 曝露的 docker socket（honeypot）容器逃逸 | `rm -f /var/run/dind/docker.sock` |

## build + push 到 Docker Hub

```bash
docker build -t <namespace>/metis-target-box:1.0.2      target-box
docker build -t <namespace>/metis-target-internal:1.0.0 target-internal
docker push <namespace>/metis-target-box:1.0.2
docker push <namespace>/metis-target-internal:1.0.0
```

目前發佈中：`allenlee564/metis-target-box:1.0.2`、`allenlee564/metis-target-internal:1.0.0`

## 交付契約（給環境端）

- 容器命名 **`blue-a-${LAB_ID}` / `blue-b-${LAB_ID}`**
- **`blue-b` 要加網路別名 `target-internal`** —— 關卡 4 seed 洩漏的憑證寫的是主機名 `target-internal`，靠 Docker 服務 DNS 解析；**不寫死 IP**，一台機器才能同時跑多套 lab（固定 IP 會 `Pool overlaps`）
- **不得 port mapping**（NAT 會毀掉防火牆追蹤）
- 資源上限 `--cpus=0.5 --memory=512m`（`target-box` 已調瘦 MySQL，穩態約 326MB）
- 建議用 `@sha256:<digest>` 釘住，不要只靠 tag

完整說明見主 repo `Metis-notes/環境交付 - 藍隊 image 與 100 人 scaling 說明.md`。

## 本地 build + 測試

```bash
docker compose -f compose.local.yml -p labtest up -d --build
# 橫向移動：docker exec blue-a-local ssh admin@target-internal  （密碼 InternalAdm1n!23）
# 收工：docker compose -f compose.local.yml -p labtest down
```

> `compose.local.yml` 只供本地 build/測試 —— 它為了方便開了 web port，**正式部署不得 port mapping**（見上）。

## 計分

判定引擎在主 repo `se-218/Metis` 的 `blue/scoring-engine/checker.py`，跑在 **host 上**（`docker exec` 進容器查），來賓拿不到、改不了。七關判定條件見該處 `README.md`。
