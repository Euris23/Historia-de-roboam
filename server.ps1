$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Server started on http://localhost:8080/"
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/") { $urlPath = "/index.html" }
        
        $cleanPath = $urlPath.Replace("/", "\").TrimStart('\')
        $localPath = Join-Path "C:\Users\MAPFRE\.gemini\antigravity-ide\scratch\roboam-storytelling" $cleanPath
        
        if (Test-Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            
            if ($localPath.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($localPath.EndsWith(".css")) { $response.ContentType = "text/css" }
            elseif ($localPath.EndsWith(".js")) { $response.ContentType = "application/javascript; charset=utf-8" }
            elseif ($localPath.EndsWith(".png")) { $response.ContentType = "image/png" }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errorBytes = [System.Text.Encoding]::UTF8.GetBytes("File Not Found")
            $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
