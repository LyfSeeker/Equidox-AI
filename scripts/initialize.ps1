param(
    [string]$SourceAccount = "alice",
    [string]$Network = "testnet",
    [Parameter(Mandatory = $true)]
    [string]$NativeToken
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$deployFile = Join-Path $env:USERPROFILE ".config\stellar\equidox\deploy-$Network.json"
if (-not (Test-Path $deployFile)) {
    throw "Deploy file not found: $deployFile. Run deploy.ps1 first."
}

$deploy = Get-Content $deployFile | ConvertFrom-Json
$passportId = $deploy.passport_contract
$grantManagerId = $deploy.grant_manager_contract
$adminAddress = stellar keys address $SourceAccount

Write-Host "Admin address: $adminAddress" -ForegroundColor Cyan
Write-Host "Passport: $passportId" -ForegroundColor Cyan
Write-Host "Grant Manager: $grantManagerId" -ForegroundColor Cyan
Write-Host "Native Token (XLM SAC): $NativeToken" -ForegroundColor Cyan

Write-Host "Initializing builder-passport (grant manager as authorized updater)..." -ForegroundColor Cyan
stellar contract invoke `
    --id $passportId `
    --source-account $SourceAccount `
    --network $Network `
    --send=yes `
    -- initialize `
    --admin $adminAddress `
    --grant_manager $grantManagerId

Write-Host "Initializing grant-manager..." -ForegroundColor Cyan
stellar contract invoke `
    --id $grantManagerId `
    --source-account $SourceAccount `
    --network $Network `
    --send=yes `
    -- initialize `
    --admin $adminAddress `
    --passport_contract $passportId `
    --native_token $NativeToken

$initInfo = @{
    network = $Network
    admin = $adminAddress
    passport_contract = $passportId
    grant_manager_contract = $grantManagerId
    native_token = $NativeToken
    initialized_at = (Get-Date -Format o)
} | ConvertTo-Json

$initFile = Join-Path $env:USERPROFILE ".config\stellar\equidox\init-$Network.json"
$initInfo | Set-Content $initFile

Write-Host "Initialization complete. Config saved to $initFile" -ForegroundColor Green
