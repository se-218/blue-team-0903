#!/bin/bash
# 給藍隊來賓在terminal裡下 `score` 查看目前分數與進度
# 分數資料由host端checker.py定期算好、推送進來，這支腳本只負責讀取顯示，
# 不含任何判定邏輯，來賓改不了怎麼判定PASS/FAIL
#
# 關卡6、7是隱藏加分題：容器不知道前端現在是哪個難度（難度只存在瀏覽器端，
# 從沒傳進容器），所以不用難度當開關——用「有沒有解出來」當開關。
# 未解出時完全不列在畫面上（分母顯示100，不是140）；一旦checker判定變成
# pass才「解鎖」出現，這樣三個難度模式下的預設畫面自然都是一致的5關。

STATUS_FILE="/opt/score/status.json"

if [ ! -f "$STATUS_FILE" ]; then
    echo "尚無評分紀錄，請稍後再試。"
    exit 0
fi

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
