import requests
import subprocess
import pymysql # 引入 MySQL 連線套件
import time
from datetime import datetime, timezone, timedelta

import os
from dotenv import load_dotenv

from google import genai
from google.genai import types

# 紀錄進度
current_dir = os.path.dirname(os.path.abspath(__file__))

PROGRESS_FILE = os.path.join(current_dir, "progress.txt")
LOG_FILE = os.path.join(current_dir, "process_log.txt")

# 1. 取得照片的base64字串
def get_photo_preview_url(unit_id, cache_key, size='sm'):
    # 設定基礎 URL (請根據你的實際環境修改網址主體)
    base_url = "http://localhost/repo/photo_monitor_ver260208/edit/get_photo_proxy.php"
    
    # 組合參數
    params = {
        'unitId': unit_id,
        'cacheKey': cache_key,
        'size': size
    }
    
    try:
        # 使用 get 請求並設定超時，模擬 JS 的 pre-load 檢查
        response = requests.get(base_url, params=params, timeout=50)
        
        # 檢查 HTTP 狀態碼是否為 200 (OK)
        response.raise_for_status()
        
        # 如果成功，回傳完整的二進制檔案
        return response.content
        
    except requests.exceptions.RequestException as e:
        # 對應 JS 的 reject("NAS 連線失敗")
        raise Exception(f"NAS 連線失敗: {e}")
    
def get_last_processed_id(progress_file=PROGRESS_FILE):
    """讀取上次處理完成的最後一個 ID"""
    if os.path.exists(progress_file):
        with open(progress_file, "r") as f:
            content = f.read().strip()
            return int(content) if content.isdigit() else 0
    return 0

def save_progress(last_id, progress_file=PROGRESS_FILE):
    """儲存當前處理完成的 ID"""
    with open(progress_file, "w") as f:
            f.write(str(last_id))


# 3. 新增：寫入執行紀錄的 Function
def write_log(message, log_file=LOG_FILE):
    """將執行紀錄寫入 log.txt，並自動加上時間戳記"""
    # 取得當下時間，格式為 YYYY-MM-DD HH:MM:SS
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # 組合 Log 訊息，並加上換行符號 \n
    log_entry = f"[{now_str}] {message}\n"
    
    # 使用 "a" (append) 模式，把新紀錄接在檔案最後面
    # 加入 encoding="utf-8" 確保中文不會變成亂碼
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(log_entry)
        
    # (選擇性) 寫入 Log 的同時，也印在畫面上方便你看
    print(f"[{now_str}] {message}")

def process_photos(limit=2):
    # 1. 建立資料庫連線 (請替換為你的實際資料庫設定)
    connection = pymysql.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),          # 預設通常是 root
        password=os.getenv("DB_PASS"),          # 填入你的密碼
        database=os.getenv("DB_NAME"),   # 替換成你的資料庫名稱
        cursorclass=pymysql.cursors.DictCursor
    )

    last_id = get_last_processed_id()
    print(f"啟動程式... 從 ID > {last_id} 開始處理。")

    try:
        with connection.cursor() as cursor:
            trial = 0

            while trial < limit:  # 可以設定一個試次限制，避免無限迴圈

                trial = trial + 1
                # 2. 每次只抓取「大於上次進度 ID」的第一筆資料 (一次一個！)
                sql = """
                    SELECT id,unit_id, cache_key, city_id, district_id, village_id, route_id, time 
                    FROM photos
                    WHERE id > %s 
                    ORDER BY id ASC 
                    LIMIT 1
                """
                cursor.execute(sql, (last_id,))
                row = cursor.fetchone()

                # 如果沒有抓到資料，代表全部處理完了
                if not row:
                    print("🎉 所有照片處理完畢！")
                    break

                current_id = row['id']
                current_unitid = row['unit_id']

                # 組裝地址
                cache_key = row['cache_key']
                city_id = row['city_id']
                district_id = row['district_id']
                village_id = row['village_id']
                route_id = row['route_id']
                address = " ".join(str(part) if part is not None and part != "" else " " for part in [city_id, district_id, village_id, route_id])

                # 時間 轉換成可讀格式 
                taiwan_tz = timezone(timedelta(hours=8))
                timestamp_dt = datetime.fromtimestamp(row['time'], tz=taiwan_tz)

                print(f"----------------------------------------")
                print(f"正在處理 ID: {current_id} | 地點: {address} | 時間: {timestamp_dt}")

                try:
                    # 3. 取得圖片
                    img = get_photo_preview_url(current_id, cache_key, 'm')
                    
                    # 4. 呼叫 Gemini 並傳入動態獲取的地址與時間
                    ai_summary = gemeni_call(img, photo_address=address, timestamp=timestamp_dt)
                    #print(f"🤖 AI 描述: {ai_summary}")

                    # 存入資料庫phototag
                   
                    upsert_sql = """
                        INSERT INTO photoexif.phototags (unit_id, cache_key, tag, time)
                        VALUES (%s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE 
                            tag = VALUES(tag), 
                            time = VALUES(time)
                    """

                    cursor.execute(upsert_sql, (current_unitid, cache_key, ai_summary, timestamp_dt))

                    connection.commit()
                    # 加上 rowcount 判斷來印出明確的結果
                    if cursor.rowcount == 1:
                        print(f"✅ 成功【新增】照片標籤 (unit_id: {current_unitid})")
                    elif cursor.rowcount == 2:
                        print(f"🔄 成功【更新】已存在的照片標籤 (unit_id: {current_unitid})")
                    else:
                        print(f"⚠️ 執行完成，但狀態未知 (unit_id: {current_unitid})")

                    # 5. 記錄當前進度並推進迴圈
                    last_id = current_id # 數字的id
                    save_progress(last_id)

                    message =  f"""----------------------------------------
                    正在處理 ID: {current_id} | 地點: {address} | 時間: {timestamp_dt}
                    🤖 AI 描述: {ai_summary}"""

                    write_log(message, log_file=LOG_FILE)
                    print(f"✅ ID: {current_id} 處理完成，進度已儲存。")
                    
                    # 稍微暫停，避免 NAS 或 API 請求過於頻繁導致被阻擋 (Rate Limit)
                    time.sleep(2) 

                except Exception as e:
                    print(f"❌ 處理 ID {current_id} 時發生錯誤: {e}")
                    # 發生嚴重錯誤時跳出迴圈，方便人工檢查
                    break

    finally:
        # 確保最後一定會關閉資料庫連線
        connection.close()
    

def gemeni_call(image_bytes,photo_address = None,timestamp = None):

    # 轉換為大模型可以使用的格式

    image = types.Part.from_bytes(
        data=image_bytes, mime_type="image/jpeg"
    )

    # photo_address 資料庫地址資訊

    # timestamp 時間戳 已經轉換成可讀格式的時間

    client = genai.Client() # 這裡會自動從環境變數 GOOGLE_API_KEY 讀取金鑰

    # 1. 建立進階設定
    my_config = types.GenerateContentConfig(
        temperature=0.4,           # 控制隨機性與創造力 (範圍 0.0 ~ 2.0)
        max_output_tokens=200    # 限制回覆的長度上限 (150 tokens 約等於 100 多個中文字)
        #top_p=0.8,                 # 控制字詞選擇的機率分佈
        #top_k=40                   # 從前 K 個最可能的字詞中做選擇
    )

    # 提示詞組裝
    prompt_text = f"這張照片的預估拍攝地點是『{photo_address}』，預估拍攝時間是『{timestamp}』。請參考這個地點資訊來描述照片內容。但如果照片內容（如室內近拍、人物特寫）明顯與該地理位置無關，請忽略地點資訊，直接客觀描述照片本身看到的畫面。"

    response = client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents=[prompt_text, image],
    config=my_config
    )

    return response.text



# 載入 .env 檔案中的環境變數
load_dotenv()
process_photos()
