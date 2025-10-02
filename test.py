#!/usr/bin/env python3
import sys
import json

# 從命令列接收參數
if len(sys.argv) < 3:
    print(json.dumps({"status": "error", "message": "缺少 cookie 或 token"}))
    sys.exit(1)

cookie_str = sys.argv[1]
token = sys.argv[2]

# 測試輸出
print(json.dumps({
    "status": "success",
    "cookie": cookie_str,
    "token": token
}, ensure_ascii=False))

