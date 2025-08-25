@echo off
echo 正在上傳修改...
git add .
git commit -m "Quick update: %date% %time%"
git push origin HEAD
echo 完成！請等2分鐘後檢查網站：
echo https://vibebrick.github.io/flood-risk-radar
pause
