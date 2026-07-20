@echo off
echo === Starting Deployment to 142.93.10.77 ===

echo.
echo 1. Building Frontend...
cd /d "%~dp0frontend"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Frontend build failed!
    exit /b 1
)

echo.
echo 2. Syncing Frontend to Droplet...
cd /d "%~dp0"
echo Cleaning remote assets...
plink -batch -hostkey "SHA256:rQUBsJ+1J+yhqdOa2/YxhDlGyBUFpPajkwtzSh1vmPU" -pw "PeriviHari@8A" root@142.93.10.77 "rm -rf /var/www/edm/frontend/assets /var/www/edm/frontend/index.html /var/www/edm/frontend/leaflet"

cd /d "%~dp0frontend\dist"
echo Copying dist files...
pscp -batch -hostkey "SHA256:rQUBsJ+1J+yhqdOa2/YxhDlGyBUFpPajkwtzSh1vmPU" -pw "PeriviHari@8A" -r index.html assets root@142.93.10.77:/var/www/edm/frontend/
if %ERRORLEVEL% neq 0 (
    echo Failed to copy dist files!
    exit /b 1
)
cd /d "%~dp0"

echo.
echo 3. Syncing Backend to Droplet...
pscp -batch -hostkey "SHA256:rQUBsJ+1J+yhqdOa2/YxhDlGyBUFpPajkwtzSh1vmPU" -pw "PeriviHari@8A" -r backend\src\* root@142.93.10.77:/var/www/edm/backend/src/
if %ERRORLEVEL% neq 0 (
    echo Failed to copy backend files!
    exit /b 1
)
pscp -batch -hostkey "SHA256:rQUBsJ+1J+yhqdOa2/YxhDlGyBUFpPajkwtzSh1vmPU" -pw "PeriviHari@8A" backend\package.json root@142.93.10.77:/var/www/edm/backend/
pscp -batch -hostkey "SHA256:rQUBsJ+1J+yhqdOa2/YxhDlGyBUFpPajkwtzSh1vmPU" -pw "PeriviHari@8A" backend\package-lock.json root@142.93.10.77:/var/www/edm/backend/

echo.
echo 4. Restarting PM2 process on Droplet...
plink -batch -hostkey "SHA256:rQUBsJ+1J+yhqdOa2/YxhDlGyBUFpPajkwtzSh1vmPU" -pw "PeriviHari@8A" root@142.93.10.77 "cd /var/www/edm/backend && npm install --production && pm2 restart edm-backend"
if %ERRORLEVEL% neq 0 (
    echo Failed to restart PM2 backend process!
    exit /b 1
)

echo.
echo === Deployment Successful! ===
