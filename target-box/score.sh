#!/bin/bash
# 給藍隊來賓在terminal裡下 `score` 查看目前分數與進度
# 分數資料由host端checker.py定期算好、推送進來，這支腳本只負責讀取顯示，
# 不含任何判定邏輯，來賓改不了怎麼判定PASS/FAIL
#
# 關卡6、7是隱藏加分題。難度（DIFFICULTY環境變數，由座位啟動時依當場
# runtime.json設定傳入，見dev-lab.sh/compose）決定要不要讓6、7有機會
# 出現在畫面上：
#   - easy / normal：無論有沒有解出來，6、7 永遠不出現，分母固定100。
#     這兩個模式本來就只有5題的教學設計，score也要跟畫面上的題目數一致。
#   - hard（或沒設定，安全預設一樣視為hard）：用「有沒有解出來」當開關，
#     未解出時不列在畫面上（分母100），一旦checker判定pass才「解鎖」，
#     分母跟著變。全部5題pass、還有未解鎖項目時，額外提示一句不洩漏內容
#     的「還有隱藏項目」。

STATUS_FILE="/opt/score/status.json"
MODE="${DIFFICULTY:-hard}"

if [ ! -f "$STATUS_FILE" ]; then
    echo "尚無評分紀錄，請稍後再試。"
    exit 0
fi

if [ "$MODE" = "easy" ] || [ "$MODE" = "normal" ]; then
  # 簡單/普通：6、7 關無論解出與否，一律不出現，不給任何提示。
  jq -r '
    (.checks | map(select(.id | test("^vuln[1-5]_")))) as $visible |
    ($visible | map(.score) | add) as $shown_score |
    ($visible | map(.max_score) | add) as $shown_max |
    (
      ["===== 目前分數：\($shown_score) / \($shown_max) ====="]
      + ["（最後檢查時間：\(.timestamp)）", ""]
      + ($visible | map(
          (if .status == "pass" then "✔ PASS"
           elif .status == "fail" then "✘ FAIL"
           else "… 尚無紀錄" end)
          + "  " + .label + "　" + (.score|tostring) + "/" + (.max_score|tostring) + "分"
        ))
    )[]
  ' "$STATUS_FILE"
else
  # 困難（或未設定）：解出來才解鎖，並提示還有未發現的項目。
  jq -r '
    (.checks | map(select((.id | test("^vuln[1-5]_")) or .status == "pass"))) as $visible |
    ($visible | map(.score) | add) as $shown_score |
    ($visible | map(.max_score) | add) as $shown_max |
    (.checks | map(select((.id | test("^vuln[1-5]_") | not) and .status != "pass")) | length > 0) as $has_hidden |
    (
      ["===== 目前分數：\($shown_score) / \($shown_max) ====="]
      + ["（最後檢查時間：\(.timestamp)）", ""]
      + ($visible | map(
          (if .status == "pass" then "✔ PASS"
           elif .status == "fail" then "✘ FAIL"
           else "… 尚無紀錄" end)
          + "  " + .label + "　" + (.score|tostring) + "/" + (.max_score|tostring) + "分"
        ))
      + (if $has_hidden and (($visible | map(select(.status != "pass")) | length) == 0)
         then ["", "🔒 還有隱藏項目尚未發現，再找找看？"]
         else [] end)
    )[]
  ' "$STATUS_FILE"
fi
