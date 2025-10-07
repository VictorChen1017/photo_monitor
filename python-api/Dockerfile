# 使用官方 Python 映像
FROM python:3.11-slim

# 設定容器內工作目錄
WORKDIR /app

# 複製需求套件檔案
COPY requirements.txt .

# 安裝 Python 套件
RUN pip install --no-cache-dir -r requirements.txt

# 複製所有程式進入容器
COPY . .

# 開放 Flask API 的 port
EXPOSE 5000

# 啟動程式
CMD ["python", "loadphoto.py"]