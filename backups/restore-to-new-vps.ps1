param(
  [Parameter(Mandatory = $true)]
  [string]$Host,

  [string]$User = 'root',

  [string]$KeyPath = "$env:USERPROFILE\.ssh\lacunose_vps_2026",

  [string]$BundlePath = (Join-Path $PSScriptRoot 'lacunose-vps-20260518-050824.bundle.tgz'),

  [string]$RemoteDir = '/root'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $BundlePath)) {
  throw "Bundle not found: $BundlePath"
}

$shaPath = "$BundlePath.sha256"
if (-not (Test-Path -LiteralPath $shaPath)) {
  throw "Checksum file not found: $shaPath"
}

$bundleName = Split-Path -Leaf $BundlePath
$backupDirName = $bundleName -replace '\.bundle\.tgz$', ''
$remote = "${User}@${Host}"

Write-Host "Uploading $bundleName to ${remote}:$RemoteDir"
scp -o BatchMode=yes -i $KeyPath $BundlePath $shaPath "${remote}:$RemoteDir/"
if ($LASTEXITCODE -ne 0) {
  throw "scp upload failed with exit code $LASTEXITCODE"
}

$restoreScript = @"
set -euo pipefail
B='$RemoteDir/$bundleName'
S='$RemoteDir/$bundleName.sha256'
D='$RemoteDir/$backupDirName'

EXPECTED="`$(awk '{print `$1}' "`$S")"
ACTUAL="`$(sha256sum "`$B" | awk '{print `$1}')"
if [ "`$EXPECTED" != "`$ACTUAL" ]; then
  echo "Checksum mismatch"
  echo "expected=`$EXPECTED"
  echo "actual=`$ACTUAL"
  exit 1
fi

rm -rf "`$D"
tar -xzf "`$B" -C '$RemoteDir'
bash "`$D/restore/restore-vps.sh" "`$D"
"@

Write-Host "Running restore on $remote"
$restoreScript | ssh -o BatchMode=yes -i $KeyPath $remote 'sudo bash -s'
if ($LASTEXITCODE -ne 0) {
  throw "remote restore failed with exit code $LASTEXITCODE"
}

Write-Host "Restore command completed."
