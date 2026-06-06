$ErrorActionPreference = 'Stop'
$localDir = 'F:\lacunose.com\backups'
$bundle = 'lacunose-vps-20260510-104019.bundle.tgz'
Remove-Item -LiteralPath (Join-Path $localDir $bundle) -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $localDir "$bundle.sha256") -Force -ErrorAction SilentlyContinue
scp -i $env:USERPROFILE\.ssh\lacunose_vps_2026 root@187.127.75.87:/root/backups/$bundle $localDir\
scp -i $env:USERPROFILE\.ssh\lacunose_vps_2026 root@187.127.75.87:/root/backups/$bundle.sha256 $localDir\
Get-FileHash -Algorithm SHA256 (Join-Path $localDir $bundle) | Format-List | Out-File -Append 'F:\lacunose.com\backups\download-20260510-104019.log'
Get-Content (Join-Path $localDir "$bundle.sha256") | Out-File -Append 'F:\lacunose.com\backups\download-20260510-104019.log'
