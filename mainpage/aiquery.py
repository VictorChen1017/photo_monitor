
import os
from dotenv import load_dotenv
import mysql.connector
import sys
import aisuite as ai
import gradio as gr
import json

# Load environment variables
load_dotenv()
# 確保 Python print 使用 UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# aisuite模型設定 全域變數
provider = "google"
model = "gemini-2.0-flash-001"
api_key = os.getenv("GMI_API_KEY")
#print("Groq key loaded:", api_key[:8] + "******")

# 註冊工具
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_photos",
            "description": "依日期與地點搜尋照片資料庫",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string"},
                    "end_date": {"type": "string"},
                    "location": {"type": "string"},
                },
                "required": ["start_date", "end_date"]
            }
        }
    }
]



def search_photos(start_date: str, end_date: str, location: str = ""):
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        database=os.getenv("DB_NAME")
    )
    cursor = conn.cursor(dictionary=True)

    # 工具的輸入為日期 例如"2024-10-01" 必須在SQL中換成字串
    # 工具的輸入為日期 例如"2024-10-01" 必須在SQL中換成字串
    sql = """
        SELECT 
            filename,
            time,
            city_id,
            district_id,
            village_id,
            route_id
        FROM photos
        WHERE time >= UNIX_TIMESTAMP(%s)
        AND time <= UNIX_TIMESTAMP(%s)
        AND time IS NOT NULL
        AND time > 0
        AND time < 2147483647
        AND (
                %s IS NULL
                OR %s = ''
                OR city_id LIKE %s
                OR district_id LIKE %s
            )
        ORDER BY time ASC;
    """
    pattern = f"%{location}%" if location else None
    cursor.execute(sql, (
        start_date,
        end_date,
        location,
        location,
        pattern,
        pattern
    ))
    result = cursor.fetchall()
    return {
        "results": result
    }

#print(search_photos("2025-08-01","2025-09-01","大安區"))






def reply(system="請用台灣習慣的中文回覆。",
          prompt="hi",
          provider=provider ,
          model=model 
          ):
    
    
    # 提示詞，有兩個步驟 第一步分析使用者語境 並根據找到的資料，改寫為回顧文字

    # 需透過類似ai agent方法將結果給下一個agent 不能在同一隻ai執行 待完成
    
    system_query = """

    你的職責是根據使用者的需求，辨識出他想要查詢的時間與地點資訊。

    你有一個 tool 工具，可依特定格式搜尋照片資料庫，參數如下：
    - start_date：搜尋起始日期（必填）
    - end_date：搜尋結束日期（可選，若缺省則默認為今天）
    - location：地點，可能是一個縣市（臺北市、高雄市等）或一個鄉鎮市區（大安區、中山區）
    注意：不能把縣市與鄉鎮合併成一串字，例如「台北市大安區」，否則會找不到資料。

    你的第一步任務：根據使用者疑問或請求，自動判斷時間與地點；
    若可以查詢資料，就呼叫 search_photos 工具。


    如果你發現呼叫 search_photos 工具候傳來是空值[] ，則回覆使用者需要更詳細的資訊

    """

    system_text = """

    你的第二步任務：根據工具回傳的照片資料(有unix時間戳、城市、鄉鎮市區、村里、路名等等)，
    將這些資料轉換為該使用者的行動軌跡，轉譯成一段具有敘事性的回憶摘要，而非僅羅列地名。

    以下是範例，可用更具溫度，不須那麼制式化的照寫：
    「在秋天微涼的十月，我沿著內灣線的小站與山
    城漫遊，之後回到台北的街區生活，你最常造訪的地方是(地名1)的(村里1).....，去……這一個月你拍了許多照片，感覺是個多采多姿的生活呢」

    """

    client = ai.Client()

    messages = [
        {"role": "system", "content": system_query}, # system ai提示詞
        {"role": "user", "content": prompt}
    ]

    # 第一階段：查詢 → 工具調用

    step1 = client.chat.completions.create(
        model=f"{provider}:{model}",
        messages=messages,
        tools=[search_photos], 
        max_turns=3
    )

    tool_result_str = step1.choices[0].message.content

    # 敘事輸出
    step2_messages = [
        {"role": "system", "content": system_text},
        {"role": "user", "content": tool_result_str}
    ]

    step2 = client.chat.completions.create(
        model=f"{provider}:{model}",
        messages=step2_messages
    )

    return tool_result_str, step2.choices[0].message.content

def main():

    # 1. 檢查是否有傳入參數
    if len(sys.argv) < 2:
        print("沒有成功傳到對話")
        return
    
    # 2. 接收 PHP 傳來的 prompt
    prompt = sys.argv[1]


    # 3. 呼叫你的 AI function
    # 字串處理 將tuple轉換成純字串 換行處理
    ai_message = reply(prompt=prompt)

    if isinstance(ai_message, (tuple, list)):
        final_text = "\n\n".join(ai_message)
    else:
        final_text = str(ai_message)

    print(final_text)

    # 4. 只回傳你要給前端的文字摘要
    #    若你已經在 reply 裡生成摘要，就直接 print ai_message

    #print(reply(prompt="請幫我找 2025 年 1 月在高雄市的照片，並幫我寫回憶摘要"))

if __name__ == "__main__":
    main()
