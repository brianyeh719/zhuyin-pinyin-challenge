@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在啟動「注音拼音挑戰」Three.js 2.5D 互動學習遊戲...
npm run dev
pause
