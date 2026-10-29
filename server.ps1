# WANDERGO 本地静态服务器（纯 PowerShell，无需安装任何依赖）
# 用途：把本目录作为网站根目录提供服务，然后自动打开浏览器
# 端口被占用时会自动 +1 重试

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$basePort = 8777
$listener = $null
for ($i = 0; $i -lt 24; $i++) {
    $tryPort = $basePort + $i
    try {
        $l = New-Object System.Net.HttpListener
        $l.Prefixes.Clear()
        $l.Prefixes.Add("http://localhost:$tryPort/")
        $l.Start()
        $listener = $l
        $port = $tryPort
        break
    } catch {
        if ($l) { try { $l.Close() } catch {} }
    }
}
if (-not $listener) { Write-Host '无法监听本地端口，请重试'; exit 1 }

$url = "http://localhost:$port/index.html"
Write-Host "服务已启动： $url"
Write-Host "（关闭本窗口即停止服务）"
Start-Process $url

$types = @{
    '.html' = 'text/html; charset=utf-8'; '.htm' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8';  '.js'  = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'; '.png' = 'image/png'
    '.jpg'  = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.gif' = 'image/gif'
    '.svg'  = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.webp' = 'image/webp'
    '.woff' = 'font/woff'; '.woff2' = 'font/woff2'; '.mp4' = 'video/mp4'
    '.mp3'  = 'audio/mpeg'; '.txt' = 'text/plain; charset=utf-8'
}

while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
    } catch { break }
    $req = $ctx.Request
    $res = $ctx.Response
    try {
        $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
        if ($path -eq '/' -or [string]::IsNullOrWhiteSpace($path)) { $path = '/index.html' }
        $file = Join-Path $root ($path.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar))
        $full = [IO.Path]::GetFullPath($file)
        if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
            $res.StatusCode = 403; $res.Close(); continue
        }
        if (Test-Path $full -PathType Container) { $full = Join-Path $full 'index.html' }
        if (Test-Path $full -PathType Leaf) {
            $ext = [IO.Path]::GetExtension($full).ToLower()
            $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
            $res.Headers['Cache-Control'] = 'no-cache'
            $bytes = [IO.File]::ReadAllBytes($full)
            $res.ContentLength64 = $bytes.Length
            if ($req.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
        } else {
            $res.StatusCode = 404
            $msg = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $res.ContentType = 'text/plain; charset=utf-8'
            $res.ContentLength64 = $msg.Length
            $res.OutputStream.Write($msg, 0, $msg.Length)
        }
    } catch {
        try { $res.StatusCode = 500 } catch {}
    } finally {
        try { $res.OutputStream.Close() } catch {}
        try { $res.Close() } catch {}
    }
}
