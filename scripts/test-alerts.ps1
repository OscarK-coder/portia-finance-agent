# PowerShell script to test Portia alerts + recommendations
# Run from project root:  .\scripts\test-alerts.ps1

$baseUrl = "http://127.0.0.1:8000/api"

Write-Host "=== Fetching Alerts ==="
$alerts = Invoke-RestMethod -Uri "$baseUrl/alerts" -Method Get
$alerts.alerts | ForEach-Object {
    Write-Host "`n⚡ Alert ID: $($_.id)"
    Write-Host "Level: $($_.level)"
    Write-Host "Message: $($_.message)"

    # Ask Portia about this alert
    $body = @{ query = $_.message; user_id = "demo" } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$baseUrl/agent/ask" -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $body

    if ($resp.responses) {
        Write-Host "👉 Portia returned $($resp.responses.Count) recommendations:"
        $resp.responses | ForEach-Object {
            Write-Host "  - Title: $($_.title)"
            Write-Host "    Desc : $($_.description)"
            if ($_.actions) {
                $_.actions | ForEach-Object {
                    Write-Host "    -> Action: $($_.label) [Tool=$($_.tool)]"
                }
            }
        }

        # OPTIONAL: Execute first action
        if ($resp.responses[0].actions) {
            $first = $resp.responses[0].actions[0]
            Write-Host "⚡ Executing demo action: $($first.label)"
            switch ($first.tool) {
                "pauseSubscription" {
                    Invoke-RestMethod -Uri "$baseUrl/subscriptions/$($first.args.id)/pause" -Method Post
                }
                "cancelSubscription" {
                    Invoke-RestMethod -Uri "$baseUrl/subscriptions/$($first.args.id)" -Method Delete
                }
                "mintUSDC" {
                    $b = @{ amount = $first.args.amount } | ConvertTo-Json
                    Invoke-RestMethod -Uri "$baseUrl/circle/mint" -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $b
                }
                "redeemUSDC" {
                    $b = @{ amount = $first.args.amount } | ConvertTo-Json
                    Invoke-RestMethod -Uri "$baseUrl/circle/redeem" -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $b
                }
                "transferUSDC" {
                    $b = @{ to = $first.args.to; amount = $first.args.amount } | ConvertTo-Json
                    Invoke-RestMethod -Uri "$baseUrl/crypto/transfer" -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $b
                }
                default {
                    Write-Host "⚠️ Tool $($first.tool) not mapped for auto-exec"
                }
            }
        }
    }
    else {
        Write-Host "⚠️ No responses from Portia for this alert."
    }
}

Write-Host "`n=== Checking Audit Logs ==="
$logs = Invoke-RestMethod -Uri "$baseUrl/logs/" -Method Get
$logs.logs | Select-Object -Last 5 | ForEach-Object {
    Write-Host "[$($_.timestamp)] $($_.type): $($_.message)"
}
