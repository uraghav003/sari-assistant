@echo off
cd /d "%~dp0"
echo Starting Vercel Dev locally on port 3001...
npx vercel dev --local --listen 3001 --yes
pause
