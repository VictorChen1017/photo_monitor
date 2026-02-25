
# Photo Monitor - 個人化照片地圖監控系統

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 結合 Synology NAS 與 WebGIS，打造專屬於你的照片足跡儀表板。

## 📖 目錄 (Table of Contents)
* [1. 專案標題與簡介](#1-專案標題與簡介-project-title--description)
* [2. 系統需求](#2系統需求-requirements)
* [3. 安裝與部署指南](#3-安裝與部署指南-installation--setup)
* [4. 使用說明](#4-使用說明-usage)
* [5. 頁面功能說明](#5-頁面功能說明-features)
* [6. 檔案結構](#6-檔案結構-project-structure)
* [7. 授權協議](#7-授權協議-license)

---

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


## 4. 使用說明 (Usage)

系統目前為求隱私安全性，不直接儲存您的 NAS 帳號密碼。登入圖台需透過手動獲取 Synology 身份驗證資訊。

### 第一步 登入 Synology Photos

請先在同一瀏覽器中，開啟分頁並登入您的 **Synology Photos** 官方網頁。

### 第二步 獲取身份驗證 Token (Cookie & X-SYNO-TOKEN)

由於 Synology 安全機制限制，需手動取得臨時授權資訊：

1. 在 Synology Photos 頁面按下 `F12` 鍵開啟「開發者工具」。
2. 切換至 **「Network (網路)」** 標籤。
3. 在頁面中隨意點擊一張照片或重新整理，在左側列表中找到名稱為 `entry.cgi` 的請求。
4. 點擊 `entry.cgi` 後，在右側找到 **「Headers」** 欄位。
5. **複製關鍵資訊：**
* **Cookie:** 複製完整的字串（包含 `_SSID`, `did`, `_CrPoSt`, `id`, `io` 等參數）。
* **X-SYNO-TOKEN:** 複製該欄位後方的隨機英數值。

> **⚠️ 注意事項：** 複製貼上時，請務必移除字串前後可能產生的多餘空格，否則會導致驗證失敗。

### 第三步 同步照片與操作圖台

回到本系統（Photo Monitor）主頁：

1. 找到頁面上方的 **「Synology 身份驗證」** 欄位。
2. 將剛才複製的 **Cookie** 與 **X-SYNO-TOKEN** 依序貼入。
3. 點擊 **「送出」**。
4. 點擊 **「載入資料庫」** 按鈕。
* 若系統顯示載入筆數大於 0，即代表成功從 NAS 同步照片元數據至本地資料庫。
* 此時地圖將會自動從exif載入照片所在的地理位置。

---

## 5. 頁面功能說明 (Features)

本系統提供多樣化的介面，幫助您從不同維度管理照片資產：

* **🏠 主頁 (Home)**
    * 負責系統登錄與身份驗證。
    * **AI 回憶摘要小幫手 (Beta)：** 串接 OpenAI/Gemini API，根據您的照片分布與時間點，自動生成一段精彩的回憶總結。

* **🔑 登入 (Sync)**
    * 資料庫同步核心操作介面，可執行與 Synology NAS 的即時資料同步。

* **🗺️ 地圖 (Map)**
    * 全螢幕地圖視覺化，支援多種呈現模式：
    * **點子圖 (Cluster)：** 適合檢視精確的照片拍攝點。
    * **熱度圖 (Heatmap)：** 視覺化呈現您最常出沒的足跡密集區。

* **📊 儀表板 (Dashboard)**
    * 提供數據統計圖表（如直條圖），顯示照片隨時間（年份/月份）變化的產量統計，掌握生活節奏。

* **✏️ 編輯 (Edit - Beta)**
    * 提供線上編輯、更新照片地理位置資訊的功能，修正缺失或錯誤的 GPS 標籤。
---

## 6. 檔案結構 (Project Structure)

了解專案的目錄結構，有助於您進行個人化修改：

```text
├── mainpage/      # 主頁相關前端腳本與邏輯
├── login/         # 登錄流程、NAS 身份驗證與資料庫同步腳本
├── map/           # 地圖互動與 Leaflet 圖層切換邏輯
├── dashboard/     # 儀表板數據處理與 Chart.js 統計圖表
├── edit/          # 照片元數據編輯頁面相關腳本 (Beta)
├── sql/           # 資料庫建置範例檔 (install.sql)
├── .env.example   # 環境變數設定範本
└── index.html      # 系統入口檔案

```

---

## 7. 授權協議 (License)

本專案採 **MIT License** 授權。歡迎個人非商業用途使用，若需進行商業應用或轉載，請註明出處。

---



