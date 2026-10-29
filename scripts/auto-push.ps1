# WANDERGO 自动提交并推送到 GitHub Pages
# 有改动才提交；推送失败（网络抖动）只记录日志，不影响下次执行
$ErrorActionPreference = 'Continue'
$repo = 'd:\Documents\Tencent Files\毕设\毕设'
$log  = Join-Path $repo 'runs\auto-push.log'
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null

function Log($m){ Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) -Encoding UTF8 }

Set-Location $repo
git add -A 2>&1 | Out-Null
$staged = git diff --cached --name-only
if(-not $staged){ Log 'no changes, skip'; exit 0 }

$msg = 'chore(auto): sync ' + (Get-Date -Format 'MM-dd HH:mm')
git commit -m $msg 2>&1 | Out-Null
Log ("committed: " + ($staged -join ', '))

$out = git push origin deploy-1029:gh-pages 2>&1
if($LASTEXITCODE -eq 0){ Log 'push OK' } else { Log ("push FAIL: " + ($out -join ' | ')) }
exit 0
