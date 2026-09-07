$ErrorActionPreference = "Continue"

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$resultFile = "test-results-$timestamp.txt"

Write-Host "========================================"
Write-Host " Enterprise Data Agent - Test Suite"
Write-Host " Started: $(Get-Date)"
Write-Host "========================================"
Write-Host ""

python -m pytest tests -v 2>&1 | Tee-Object -FilePath $resultFile

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "========================================"
Write-Host " Test run completed"
Write-Host " Result file: $resultFile"
Write-Host " Exit code: $exitCode"
Write-Host "========================================"

exit $exitCode
