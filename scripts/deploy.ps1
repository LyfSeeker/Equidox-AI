param(
    [string]$SourceAccount = "alice",
    [string]$Network = "testnet"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Building contracts..." -ForegroundColor Cyan
Push-Location $Root
stellar contract build
Pop-Location

$PassportWasm = Join-Path $Root "target\wasm32v1-none\release\builder_passport.wasm"
$GrantWasm = Join-Path $Root "target\wasm32v1-none\release\grant_manager.wasm"

if (-not (Test-Path $PassportWasm)) {
    throw "Missing $PassportWasm - run stellar contract build first"
}
if (-not (Test-Path $GrantWasm)) {
    throw "Missing $GrantWasm - run stellar contract build first"
}

Write-Host "Deploying builder-passport..." -ForegroundColor Cyan
$passportId = stellar contract deploy `
    --wasm $PassportWasm `
    --source-account $SourceAccount `
    --network $Network `
    --alias equidox_passport

Write-Host "Passport contract ID: $passportId" -ForegroundColor Green

Write-Host "Deploying grant-manager..." -ForegroundColor Cyan
$grantManagerId = stellar contract deploy `
    --wasm $GrantWasm `
    --source-account $SourceAccount `
    --network $Network `
    --alias equidox_grant_manager

Write-Host "Grant manager contract ID: $grantManagerId" -ForegroundColor Green

$deployDir = Join-Path $env:USERPROFILE ".config\stellar\equidox"
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

$deployInfo = @{
    network = $Network
    passport_contract = $passportId
    grant_manager_contract = $grantManagerId
    deployed_at = (Get-Date -Format o)
} | ConvertTo-Json

$deployFile = Join-Path $deployDir "deploy-$Network.json"
$deployInfo | Set-Content $deployFile

Write-Host "Deployment info saved to $deployFile" -ForegroundColor Green
Write-Host ""
Write-Host "Next: run initialize.ps1 with the native XLM SAC address" -ForegroundColor Yellow
Write-Host "  .\scripts\initialize.ps1 -SourceAccount $SourceAccount -Network $Network -NativeToken <XLM_SAC_ADDRESS>"
