# deploy.ps1
# Script to build and deploy EDM project to DigitalOcean droplet

# Ensure we run in the script's folder using -LiteralPath to handle brackets correctly
Set-Location -LiteralPath $PSScriptRoot

$IP = "142.93.10.77"
$Password = "PeriviHari@8A"
$HostKey = "SHA256:rQUBsJ+1J+yhqdOa2/YxhDlGyBUFpPajkwtzSh1vmPU"
$RemotePath = "/var/www/edm"

Write-Host "=== Starting Deployment to $IP ===" -ForegroundColor Cyan

# 1. Build frontend
Write-Host "`n1. Building Frontend..." -ForegroundColor Yellow
Push-Location -LiteralPath "frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# 2. Sync Frontend to Droplet
Write-Host "`n2. Copying built Frontend to Droplet..." -ForegroundColor Yellow
# Clear old frontend assets and index.html
plink -batch -hostkey $HostKey -pw $Password root@$IP "rm -rf $RemotePath/frontend/assets $RemotePath/frontend/index.html"

# Copy new dist files
Push-Location -LiteralPath "frontend/dist"
pscp -batch -hostkey $HostKey -pw $Password -r index.html assets "root@${IP}:$RemotePath/frontend/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to copy frontend files!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# 3. Sync Backend to Droplet
Write-Host "`n3. Copying Backend source to Droplet..." -ForegroundColor Yellow
pscp -batch -hostkey $HostKey -pw $Password -r backend/src/* "root@${IP}:$RemotePath/backend/src/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to copy backend files!" -ForegroundColor Red
    exit 1
}

# Copy package.json to backend
pscp -batch -hostkey $HostKey -pw $Password backend/package.json "root@${IP}:$RemotePath/backend/"
pscp -batch -hostkey $HostKey -pw $Password backend/package-lock.json "root@${IP}:$RemotePath/backend/"

# 4. Install dependencies and restart Backend on Droplet
Write-Host "`n4. Restarting PM2 process on Droplet..." -ForegroundColor Yellow
plink -batch -hostkey $HostKey -pw $Password root@$IP "cd $RemotePath/backend && npm install --production && pm2 restart edm-backend"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to restart PM2 backend process!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Deployment Successful! ===" -ForegroundColor Green
