import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import json
from urllib.parse import quote

import os
import sys

# 這裡是首頁登錄的python，功能單純化僅保留登錄功能

sys.stdout.reconfigure(encoding='utf-8')  # 確保標準輸出用 UTF-8
# === 登入參數 ===

# sys.argv[1] = cookie_str
# sys.argv[2] = token
# sys.argv[3] = nas_url

all_items = []
limit = 1 # 測試
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
cookie_str = sys.argv[1].strip() # 移除前後空格
token = sys.argv[2].strip() # 移除前後空格

cookies = cookie_str_to_dict(cookie_str)
#print(cookies)

# 登錄資訊預先寫好

session_filename = "./session_config.json" # 統一存取位置
session_data = {
    "cookies": cookies,
    "token": token,
    "nas_url": nas_url
}


# 登錄嘗試

# === 驗證登錄並檢查資料存取 ===
try:
    # 僅請求 1 筆資料來驗證連線是否正常
    params = {
        "api": "SYNO.Foto.Browse.Item",
        "method": "list",
        "version": "1",
        "offset": 0,
        "limit": 1, 
        "SynoToken": token,
        "additional": '["gps","address","thumbnail"]'
    }

    res = requests.get(info_api, cookies=cookies, params=params, verify=False, timeout=10)
    res.raise_for_status() # 檢查 HTTP 狀態碼
    
    data = res.json()
    
    # 判斷 Synology API 回傳的成功標誌
    if data.get('success'):

        try:

            # 寫入json檔案
            with open(session_filename, "w", encoding="utf-8") as sf:
                json.dump(session_data, sf, ensure_ascii=False, indent=2)

            # 獲取總資料筆數（這通常存在於回傳的 paging 資訊中）
            total_count = data.get('data', {}).get('total', 0)
            
            result = {
                "status": "success",
                "message": "登錄成功並已建立連線",
                "file": session_filename,
                "total_available": total_count  # 告知 NAS 中共有多少筆資料
            }

        except Exception as file_error:
            result = {
                "status": "error",
                "message": f"驗證成功但無法寫入檔案: {str(file_error)}"
            }


    else:
        # 如果 success 為 false，通常是 token 或 cookie 錯誤
        error_code = data.get('error', {}).get('code', 'unknown')
        result = {
            "status": "error",
            "message": f"NAS 驗證失敗，錯誤代碼：{error_code}，未更改設定檔",
            "total_available": 0
        }

except Exception as e:
    result = {
        "status": "error",
        "message": f"連線異常：{str(e)}",
        "total_available": 0
    }

# 最終僅輸出 JSON 結果供 PHP/前端 接收
print(json.dumps(result, ensure_ascii=False))
