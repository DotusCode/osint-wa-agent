$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$vendorRoot = Join-Path $projectRoot "tools\vendor"
New-Item -ItemType Directory -Force -Path $vendorRoot | Out-Null
$venv = Join-Path $projectRoot ".venv"
if (-not (Test-Path -LiteralPath $venv)) { python -m venv $venv }
$python = Join-Path $venv "Scripts\python.exe"
if (-not (Test-Path -LiteralPath $python)) { $python = Join-Path $venv "bin\python" }
& $python -m pip install openosint toutatis MetaDetective
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("mrholmes-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
$archive = Join-Path $temporaryRoot "mrholmes.zip"
Invoke-WebRequest -Uri "https://github.com/Lucksi/Mr.Holmes/archive/refs/heads/master.zip" -OutFile $archive
Expand-Archive -LiteralPath $archive -DestinationPath $temporaryRoot
$source = Get-ChildItem -LiteralPath $temporaryRoot -Directory | Where-Object Name -Like "Mr.Holmes-*" | Select-Object -First 1
if (-not $source) { throw "Pacote Mr.Holmes inválido" }
$destination = Join-Path $vendorRoot "Mr.Holmes"
if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Recurse -Force }
Move-Item -LiteralPath $source.FullName -Destination $destination
Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
Write-Output "Ferramentas instaladas em .venv. Aponte os campos *_BIN do .env.local para os executáveis dessa pasta."
