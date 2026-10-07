#Requires -Version 7.3
[CmdletBinding()]
param(
  # Omit to release the version already declared in package.json (useful for the first release).
  [string] $Version = ""
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

Push-Location $PSScriptRoot
try {
  if ((git branch --show-current) -ne "main") {
    throw "Releases must be prepared from main."
  }
  if (git status --porcelain) {
    throw "The SDK working tree must be clean."
  }

  $package = Get-Content -Raw -LiteralPath "package.json" | ConvertFrom-Json
  $currentVersion = $package.version
  $targetVersion = if ($Version -eq "") { $currentVersion } else { $Version.Trim().TrimStart("v") }
  if ($targetVersion -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$') {
    throw "Invalid version '$targetVersion'."
  }

  if (-not ((git remote) -contains "origin")) {
    throw "The official origin remote is not configured."
  }
  $origin = git remote get-url origin
  if ($origin -notmatch '^https://github\.com/OpenMeshTAK/openmeshtak-sdk(?:\.git)?$') {
    throw "Unexpected origin '$origin'; expected OpenMeshTAK/openmeshtak-sdk."
  }

  git fetch --quiet --tags origin
  if ((git rev-parse HEAD) -ne (git rev-parse origin/main)) {
    throw "Local main is not in sync with origin/main."
  }

  $tag = "v$targetVersion"
  if (git tag --list $tag) {
    throw "Tag $tag already exists."
  }

  $versionChanged = $targetVersion -ne $currentVersion
  if ($versionChanged) {
    pnpm version:set -- $targetVersion
    pnpm generate
  }

  pnpm check
  pnpm release:notices
  npm pack --dry-run --ignore-scripts
  git --no-pager diff --stat

  $answer = Read-Host "Commit if needed, tag $tag and push to origin? [y/N]"
  if ($answer -notmatch '^(y|yes|j|ja)$') {
    if ($versionChanged) {
      git restore package.json src/version.ts
    }
    Write-Host "Cancelled."
    exit 1
  }

  if ($versionChanged) {
    git add package.json src/version.ts
    git commit -m "chore(release): $targetVersion"
    git push origin main
  }

  git tag -a $tag -m "OpenMeshTak SDK $targetVersion"
  git push origin $tag
  Write-Host "Release $tag dispatched." -ForegroundColor Green
}
finally {
  Pop-Location
}
