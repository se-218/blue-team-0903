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

## 發佈

打 tag 就好，其餘由 `.github/workflows/publish-images.yml` 做完：build → 冒煙測試 → 推 GHCR。

```bash
git tag v1.0.3 && git push origin v1.0.3
```

**版本號的唯一出處是 git tag。** 手動 build 手動 push 的時候，「原始碼是對的」跟
「發佈中的 image 是對的」沒有任何東西在同步 —— 實際出過事：主 repo 的
`deploy/compose.blue.yml` 釘著 `1.0.0`（seed 寫死 IP 的舊版），而 `1.0.2` 早就修好發佈了，
從外面看不出差別，關卡 4 的橫向移動在那個組合下是斷的。

發佈前的冒煙測試會擋下這類問題，整段跑在**禁止出網**的網路上（順便驗契約第 6 條）：

- 七個關卡的漏洞都還在（權限沒被 build 過程改掉、honeypot 活著、webshell 軌跡有預埋）
- 關卡 4 整條路徑：seed 是主機名 `target-internal`（不是寫死 IP）、解析得到、SSH 通、目標檔在
- 交付契約 2／3／5／6

**刻意不推 `latest`** —— 契約要求正式部署釘死版本，有一個會浮動的 tag 存在遲早有人拿去部署。

| | 位置 |
|---|---|
| 現行 | `ghcr.io/se-218/metis-target-box`、`ghcr.io/se-218/metis-target-internal` |
| 舊的（勿用於新部署） | `allenlee564/metis-target-box`、`allenlee564/metis-target-internal`（Docker Hub） |

> GHCR 的 package 預設 **private**，`compose.blue.yml` 是不帶認證直接 pull 的 ——
> 第一次推完要到 Packages 頁設成 Public 並 link 到本 repo，否則環境端拉不到，
> 而錯誤訊息長得像「image 不存在」。

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
