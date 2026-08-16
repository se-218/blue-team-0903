#!/bin/bash
# 給藍隊來賓在terminal裡下 `score` 查看目前分數與進度
# 分數資料由host端checker.py定期算好、推送進來，這支腳本只負責讀取顯示，
# 不含任何判定邏輯，來賓改不了怎麼判定PASS/FAIL

STATUS_FILE="/opt/score/status.json"

if [ ! -f "$STATUS_FILE" ]; then
    echo "尚無評分紀錄，請稍後再試。"
    exit 0
fi

jq -r '
  "===== 目前分數：\(.total_score) / \(.max_score) =====",
  "（最後檢查時間：\(.timestamp)）",
  "",
  (.checks[] | (
    if .status == "pass" then "✔ PASS"
    elif .status == "fail" then "✘ FAIL"
    else "… 尚無紀錄" end
  ) + "  " + .label + "　" + (.score|tostring) + "/" + (.max_score|tostring) + "分")
' "$STATUS_FILE"
