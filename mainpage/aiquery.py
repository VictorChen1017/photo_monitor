
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

        你是一個照片資料庫查詢助手，你的職責是精準地從使用者請求中提取「日期」與「地點」資訊。

        1. **日期提取規則：**
        - 提取「起始日期 (start_date)」和「結束日期 (end_date)」，兩者都必須使用 'YYYY-MM-DD' 格式。
        - 如果使用者只提供一個日期，該日期同時作為 start_date 和 end_date。
        - 如果使用者只說「某月」或「某年」，請盡量將其解析為該期間的第一天到最後一天。
        - 如果使用者沒有提供「結束日期」，請將今天的日期作為 end_date。

        2. **地點提取規則：**
        - 提取地點 (location)，地點應為**單一**縣市或鄉鎮市區名稱，例如「臺北市」或「大安區」。
        - **禁止**將縣市與鄉鎮合併（例如「台北市大安區」）。

        3. **工具呼叫：**
        - 你的唯一工具是 `search_photos`。
        - 成功提取參數後，請**立即且僅呼叫** `search_photos` 工具，不需任何額外的文字解釋。
        - 如果無法提取到任何日期資訊，請以中文回覆使用者，要求提供更詳細的日期。

        範例：
        使用者：我想找去年十月在臺北市的照片
        應呼叫：search_photos(start_date="2024-10-01", end_date="2024-10-31", location="臺北市")

        使用者：上週在信義區的照片
        應呼叫：search_photos(start_date="2025-12-06", end_date="2025-12-12", location="信義區")

    """

    system_text = """

        你的職責是分析工具回傳的 JSON 照片資料，並將其轉化為一份溫暖、個人化的「回憶摘要」。

        1. **數據分析：**
        - 分析 JSON 數據中的 `city_id`、`district_id`、`village_id` 等地點資訊。
        - **統計**每個村里 (`village_id`) 及其所在鄉鎮市區 (`district_id`) 的照片數量（出現頻率）。
        - **選取**照片數量最多的前五個地點作為核心軌跡。

        2. **摘要生成：**
        - 將這些核心地點轉譯成一段流暢、情感豐富的中文段落。
        - 摘要應包含以下要素：
            - **總結**：總共找到了多少張照片，涵蓋的日期範圍。
            - **核心軌跡**：你主要在哪幾個鄉鎮或村里活動。
            - **溫馨推測**：根據地點資訊（例如：大安區、信義區、某路名），想像使用者可能拍攝了什麼，並用**具溫度且富創意的文字**呈現。
            - **結尾**：一句期待下次回憶的結語。

        3. **空值處理：**
        - 如果傳入的 JSON 數據為空（例如：`{"results": []}`），請用中文回覆使用者：「抱歉，我在您指定的日期和地點範圍內沒有找到任何照片。請試試不同的日期或地點。」

        請以一個專業且充滿人情味的語氣進行回覆。

    """

    client = ai.Client()

    messages = [
        {"role": "system", "content": system_query},
        {"role": "user", "content": prompt}
    ]

    # 第一階段：查詢 → 工具調用

    step1 = client.chat.completions.create(
        model=f"{provider}:{model}",
        messages=messages
        #tools=[search_photos], 
    )
    try: # 執行沒問題
        
        tool_result_dict= eval(step1.choices[0].message.content) # 代替執行工具的功能 輸出為一字典
        tool_result_json = json.dumps(tool_result_dict) # 將傳遞從json變成字典 確保可以順利當作模型輸入
        #print("順利執行搜尋")
        
    except:
        #print("模型輸出非程式碼")
        return step1.choices[0].message.content


    # 敘事輸出
    step2_messages = [
        {"role": "system", "content": system_text},
        {"role": "user", "content": tool_result_json}
    ]

    step2 = client.chat.completions.create(
        model=f"{provider}:{model}",
        messages=step2_messages
    )

    #return tool_result_str, step2.choices[0].message.content
    #print("第二階段執行完成")
    return step2.choices[0].message.content

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
