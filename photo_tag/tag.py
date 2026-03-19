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
def get_photo_preview_url(unit_id, cache_key, size='m'):
    # 設定基礎 URL (請根據你的實際環境修改網址主體)
    base_url = "http://localhost/repo/photo_monitor_ver260208/photo_tag/get_photo_base64.php"
    
    # 組合參數
    params = {
        'unitId': unit_id,
        'cacheKey': cache_key,
        'size': size
    }
    
    try:
        # 使用 get 請求並設定超時，模擬 JS 的 pre-load 檢查
        response = requests.get(base_url, params=params, timeout=50)
        #req = response.request
        #print(f"網址 (URL): {req.url}")
        #print(f"請求標頭 (Headers): {req.headers}")
        
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
            return int(content) if content.isdigit() else 0 #int(time.time())
    return 0 #int(time.time())

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

def process_photos(limit=500):
    # 1. 建立資料庫連線 (請替換為你的實際資料庫設定)
    connection = pymysql.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),          # 預設通常是 root
        password=os.getenv("DB_PASS"),          # 填入你的密碼
        database=os.getenv("DB_NAME"),   # 替換成你的資料庫名稱
        cursorclass=pymysql.cursors.DictCursor
    )

    last_id = get_last_processed_id() # 改為紀錄時間
    print (last_id)
    print(f"啟動程式... 從 時間戳 < {last_id} 開始處理。")

    try:
        with connection.cursor() as cursor:
            trial = 0

            while trial < limit:  # 可以設定一個試次限制，避免無限迴圈

                trial = trial + 1
                print(f"本執行梯次第 {trial} 筆資料...")
                # 2. 每次只抓取「大於上次進度 ID」的第一筆資料 (一次一個！)
                sql = """
                    SELECT id,unit_id, cache_key, city_id, district_id, village_id, route_id, time 
                    FROM photos
                    WHERE time > %s 
                    ORDER BY time ASC
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

                dt_object = datetime.fromtimestamp(row['time'], tz=timezone.utc) # 資料庫時間已經是台灣時間 或是拍照時的當地時間
                timestamp_dt = dt_object.strftime('%Y-%m-%d %H:%M:%S')

                print(f"----------------------------------------")
                print(f"正在處理 ID: {current_id} | 地點: {address} | 時間: {timestamp_dt}")

                # 建立重試機制
                max_retries=3

                for attempt in range(max_retries):

                    try:
                        # 3. 取得圖片
                        img = get_photo_preview_url(current_unitid, cache_key, 'm')
                        
                        # 4. 呼叫 Gemini 並傳入動態獲取的地址與時間
                        ai_summary = gemeni_call(img, photo_address=address, timestamp=timestamp_dt)
                        #print(f"🤖 AI 描述: {ai_summary}")

                        # 存入資料庫phototag
                    
                        upsert_sql = """
                            INSERT INTO photoexif.phototags (unit_id, cache_key, tag, time)
                            
                            VALUES (%s, %s, %s, %s)
                            ON DUPLICATE KEY UPDATE 
                                cache_key = VALUES(cache_key),
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
                        last_id = row['time'] # 改為依據時間戳來記錄進度
                        save_progress(last_id)

                        message =  f"""----------------------------------------
                        正在處理 ID: {current_id} | 地點: {address} | 時間: {timestamp_dt}
                        🤖 AI 描述: {ai_summary}"""

                        write_log(message, log_file=LOG_FILE)
                        print(f"✅ ID: {current_id} 處理完成，進度已儲存。")
                        
                        # 稍微暫停，避免 NAS 或 API 請求過於頻繁導致被阻擋 (Rate Limit)
                        time.sleep(5) 

                        break # 成功處理後跳出重試迴圈，繼續處理下一筆資料

                    except Exception as e:
                        print(f"❌ 處理 ID {current_id} 時發生錯誤: {e}")
                        if "503" in str(e) or "UNAVAILABLE" in str(e):
                            # 出現503錯誤 代表賜服器忙碌 稍後嘗試
                            if attempt < max_retries - 1:
                                wait_time = 15 # 等待10秒後重試 
                                print(f"⚠️ 伺服器忙碌中 (503)，{wait_time} 秒後進行第 {attempt + 2} 次重試...")
                                message = f"⚠️ 伺服器忙碌中 (503)，{wait_time} 秒後進行第 {attempt + 2} 次重試..."
                                write_log(message, log_file=LOG_FILE)
                                time.sleep(wait_time)
                                continue
                        # 發生嚴重錯誤時跳出迴圈，方便人工檢查

                        # 加一個照片縮圖處理失敗的錯誤，通常是 NAS 連線問題，這種情況下直接跳過這筆資料，繼續處理下一筆
                        elif "400" in str(e):
                            if attempt < max_retries - 1:
                                wait_time = 10 # 等待10秒後重試 
                                print(f"⚠️ 伺服器忙碌中 (503)，{wait_time} 秒後進行第 {attempt + 2} 次重試...")
                                time.sleep(wait_time)
                                continue
                            print(f"⚠️ 由於 NAS 連線失敗，已跳過 ID {current_id}，繼續處理下一筆資料。")
                            message = f"⚠️ 由於 NAS 連線失敗，已跳過 ID {current_id}，繼續處理下一筆資料。" 
                            write_log(message, log_file=LOG_FILE)
                            save_progress(last_id) # 儲存當前id 才可以跳過
                            break
                        
                        elif "1048" in str(e):
                            if attempt < max_retries - 1:
                                wait_time = 10 # 等待10秒後重試
                                print(f"⚠️ 資料庫錯誤 (1048)，可能是因為資料不完整，{wait_time} 秒後進行第 {attempt + 2} 次重試...")
                                time.sleep(wait_time)
                                continue
                            break


                        else:
                            print(f"❌ 處理 ID {current_id} 時發生未預期的錯誤: {e}")
                            message = f"❌ 處理 ID {current_id} 時發生未預期的錯誤: {e}"
                            write_log(message, log_file=LOG_FILE)
                            save_progress(last_id) # 儲存當前id 才可以跳過
                            raise e # 其他錯誤直接丟出，讓程式停下來，方便人工檢查
                        
    except Exception as e:
        print(f"❌ 程式執行過程中發生錯誤: {e}")
        message = f"❌ 程式執行過程中發生錯誤，程式已停止: {e}"
        write_log(message, log_file=LOG_FILE)


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

    # 提示詞組裝 並加入地點判斷

    has_location = bool(photo_address and photo_address.strip())

    if has_location:
        print(f"📍 地址資訊存在，將其作為輔助參考。地址: {photo_address}")
   
    # 情況 A：有地址資料。將地址降級為「輔助參考」，強調「以視覺為主」
        prompt_text = f"""以下提供影像的背景詮釋資料作為輔助參考：
        - 拍攝地點：{photo_address}
        - 拍攝時間：{timestamp}

        【任務指示】：
        請客觀描述這張影像中實際可見的場景、建築特徵、物件與人物活動。
        若影像的視覺特徵（如招牌文字、特定地標）與提供的地點資訊不符，請**絕對以影像實際呈現的內容為主**，忽略輔助地點。

        【嚴格格式限制】：
        1. 直接開始描述畫面內容，絕對不要重複上述的時間與地點資訊。
        2. 請用自然流暢的繁體中文，將敘述控制在 3 到 4 句以內，精簡扼要。"""
    else:
        print("⚠️ 地址資訊不存在，將完全忽略地點，專注於影像的視覺內容。")
        # 情況 B：沒有地址資料（空值）。完全不要提及地點，讓 AI 純粹進行視覺判讀
        prompt_text = f"""【任務指示】：
        請客觀描述這張影像中實際可見的場景、建築特徵、物件與人物活動。

        【嚴格格式限制】：
        1. 直接開始描述畫面內容，不要使用「這張照片描繪了...」等開場白。
        2. 請用自然流暢的繁體中文，將敘述控制在 3 到 4 句以內，精簡扼要。"""

    response = client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents=[prompt_text, image],
    config=my_config
    )

    return response.text



# 載入 .env 檔案中的環境變數
load_dotenv()
process_photos()
