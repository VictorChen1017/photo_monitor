import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import json
from urllib.parse import quote

import os
import sys

sys.stdout.reconfigure(encoding='utf-8')  # 確保標準輸出用 UTF-8
# === 登入參數 ===

# sys.argv[1] = cookie_str
# sys.argv[2] = token
# sys.argv[3] = nas_url

all_items = []
limit = 5000 # 單次請求上限
offset = 0 # 初始化
filename = "./all_items.json"

nas_url = sys.argv[3]
info_api = f"{nas_url}/webapi/entry.cgi"

# === 處理cookie ===

# 若輸入有誤則跳出錯誤
if len(sys.argv) < 3:
    print(json.dumps({"status": "error", "message": "缺少 cookie 或 token"}))
    sys.exit(1)

# 瀏覽器字串處理
def cookie_str_to_dict(cookie_str: str) -> dict:
    cookies = {}
    for item in cookie_str.split("; "):  # 以 "; " 分隔
        if "=" in item:
            key, value = item.split("=", 1)  # 只切第一個 "="
            cookies[key] = value
    return cookies

# 接收來自php傳來的資料 資料類別：str
#cookie_str = input("請輸入cookie") 
#token = input("請輸入token") 
cookie_str = sys.argv[1]
token = sys.argv[2]

cookies = cookie_str_to_dict(cookie_str)
print(cookies)

# === 檢查資料是否存在 ===
if os.path.exists(filename):
    os.remove(filename)
    print("檔案已存在，已重新創建")
result = {} # 回傳資料

# === 爬取資料 ===

try:
  
  
  while offset < 500000: # 避免無限迴圈
    params = {
        "api": "SYNO.Foto.Browse.Item",
        "method": "list",
        "version": "1",
        "offset": offset,
        "limit": 5000,
        "SynoToken": token,
        "additional": '["gps"]'
    }

    res = requests.get(info_api, cookies=cookies, params=params, verify=False)
    data = res.json()
    items = data.get('data', {}).get('list', [])
    all_items.extend(items)
    print(f"已累積：{len(all_items)} 筆")

    # 如果回傳數量小於 limit，就代表沒有更多資料
    if len(items) < limit:
        break

    offset += limit

  with open(filename, "w", encoding="utf-8") as f:
      json.dump(all_items, f, ensure_ascii=False, indent=2)

  result = {
        "status": "success",
        "message": "資料已成功寫入 JSON 檔案",
        "file": filename,
        "total_items": len(all_items)
    }

except Exception as e:
    result = {
        "status": "error",
        "message": str(e),
        "file": filename,
        "total_items": 0
    }

print(json.dumps(result, ensure_ascii=False))

# 回傳說明
# 1.儲存資料的json檔案
# 2.資料總筆數len(all_items)
# 3.成功或失敗訊息