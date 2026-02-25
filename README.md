## 1. 專案標題與簡介 (Project Title & Description)

Photo Monitor 是一款專為 Synology NAS 使用者設計的照片地理資訊管理工具。它能自動提取 NAS 中的照片元數據（Metadata），並將其轉化為直觀的地圖動態展示，讓你的數位足跡不再只是冷冰冰的檔案夾。

### 緣起

本專案深受 世界迷霧 (Fog of World) 的探索精神與 Google Photos 地圖功能的啟發。身為 Synology 使用者，雖然官方提供了強大的儲存功能，但在「地理軌跡視覺化」與「照片數據統計」上仍有進步空間。

因此開發了這套工具，串聯 Synology NAS 檔案資料與WebGIS圖台服務，打造一個專屬於個人的照片地理儀表板。

### 核心功能

視覺化足跡回顧： 透過 Leaflet 互動地圖，將多年來的旅行軌跡一覽無遺地呈現，包含點位圖、熱度圖等功能

照片時間軸儀表板：依據年/月/日彙整照片數量，了解何時的你喜歡拍照

ai回憶助手：運用照片紀錄的資訊，統整足跡回顧 [beta]

作為官方Synology Photos補充：補齊官方 App 在大數據量統計與自定義地圖介面上的不足

## 2.系統需求 (Requirements)

硬體/環境： 本專案基於XAMPP 環境開發，可移植至支援PHP的伺服器中

需求：需有Synology NAS帳戶

軟體版本： `Python 3.x`, `PHP 7.4+`, `MySQL/SQLite`。

 API Key： 可加入LLM服務key 使用ai回憶助手功能


**2. 腳本使用的主要模組說明：**

* `requests`: 用於發送 HTTP 請求（需手動安裝）。

* `urllib3`: 處理網路連線安全性（隨 requests 自動安裝）。

* `json`: 處理照片元數據與 API 回傳格式（內建）。

* `os` & `sys`: 處理檔案路徑與系統操作（內建）。

* `urllib.parse`: 處理 URL 編碼，確保中文字元路徑正確（內建）。


 ## 3. 安裝與部署指南 (Installation & Setup)

本章節將引導你在本地環境（以 **XAMPP** 為例）架設服務。請確保你已安裝 [XAMPP](https://www.apachefriends.org/index.html) 以及 [Python 3](https://www.python.org/)。

### 第一步：下載專案 (Clone Project)

開啟終端機（Terminal 或 CMD），導向至 XAMPP 的網頁根目錄並複製專案：

```bash
cd C:\xampp\htdocs
git clone https://github.com/VictorChen1017/photo_monitor.git
cd photo_monitor

```

### 第二步：配置環境變數 (Configuration)

系統需要正確的參數才能連線至你的資料庫與 NAS。

1. 在專案目錄中找到 `.env.example` 檔案。
2. 將其重新命名為 `.env`。
3. 使用文字編輯器（如 VS Code 或 Notepad++）編輯以下內容：

| 參數 | 說明 | 範例 |
| --- | --- | --- |
| **DB_HOST** | 資料庫伺服器位置 | `localhost` |
| **DB_USER** | 資料庫使用者名稱 | `你的帳號` |
| **DB_PASS** | 資料庫密碼 | `你的密碼` |
| **DB_NAME** | 資料庫名稱 | `photo_monitor_db` |
| **PYTHON_PATH** | Python 執行檔路徑 | `C:\\Users\\USER\\anaconda3\\envs\\your_env_name\\python.exe` |
| **NAS_URL** | Synology 連線網址 | `https://your-account.tw6.quickconnect.to` |
| **NAS_USER** | NAS 使用者名稱 | `admin` |
| **NAS_PASS** | NAS 使用者密碼 | `your_password` |
| **API_KEY** | (可選) AI 對話功能 | `sk-xxxx...` |

### 第三步：資料庫初始化 (Database Setup)

1. 開啟瀏覽器進入 `http://localhost/phpmyadmin`。
2. 建立一個新資料庫，命名為 `photo_monitor_db`。
3. 點選上方導覽列的 **「匯入 (Import)」**。
4. 點擊 **「選擇檔案」**，選取專案資料夾內 `sql/install.sql`。
5. 拉至最下方按下 **「執行 (Go)」**，系統將自動建立所有必要的資料表結構。

### 第四步：啟動服務 (Launch with XAMPP)

1. 開啟 **XAMPP Control Panel**。
2. 在 **Apache** 與 **MySQL** 欄位按下 **「Start」**（啟動後背景會呈現綠色）。
3. 使用 Python 安裝必要相依套件：
```bash
pip install -r requirements.txt
```
 或是手動安裝必須套件
```bash
pip install requests
```

4. **瀏覽網頁：**
開啟瀏覽器並輸入：`http://localhost/photo_monitor`
（註：若你的資料夾名稱不同，請自行修改 URL）。

---

###  部署小提醒

* **反斜線注意：** 在 `.env` 設定 `PYTHON_PATH` 時，請確保路徑中的斜線寫法正確（Windows 環境通常建議使用雙反斜線 `\\`）。
* **防火牆設定：** 若無法連線 NAS，請確認你的 NAS 設定中已允許該連線來源，且 QuickConnect 功能正常運作。





