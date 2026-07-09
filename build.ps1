# Build script for LM Studio plugin
$ErrorActionPreference = "Stop"

Write-Host "Building LM Studio plugin..."

# Run TypeScript compiler
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed with exit code $LASTEXITCODE"
    exit 1
}

# Copy behavioral-guidance.json to dist/tools/ so it's bundled with the JS
if (Test-Path "src/tools/behavioral-guidance.json") {
    Copy-Item "src/tools/behavioral-guidance.json" "dist/tools/behavioral-guidance.json" -Force
    Write-Host "Copied behavioral-guidance.json to dist/tools/"
}

Write-Host "Build completed successfully!"
Write-Host "`nDist contents:"
Get-ChildItem dist -Recurse -Name