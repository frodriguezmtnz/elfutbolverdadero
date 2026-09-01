# Genera public/og.png (1200x630) con System.Drawing.
# Solo Windows. Ejecutar: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generar-og.ps1
Add-Type -AssemblyName System.Drawing

$W = 1200
$H = 630
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

$bg = [System.Drawing.Color]::FromArgb(27, 77, 62)
$bgDark = [System.Drawing.Color]::FromArgb(22, 66, 53)
$orange = [System.Drawing.Color]::FromArgb(255, 87, 34)
$cream = [System.Drawing.Color]::FromArgb(232, 240, 236)

# Fondo con degradado sutil
$rect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $bg, $bgDark, 55.0)
$g.FillRectangle($grad, $rect)

# Motivo de campo: borde, linea central y circulo
$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(34, 255, 255, 255), 4)
$g.DrawRectangle($linePen, 40, 40, ($W - 80), ($H - 80))
$g.DrawLine($linePen, ($W / 2), 40, ($W / 2), ($H - 40))
$g.DrawEllipse($linePen, (($W / 2) - 90), (($H / 2) - 90), 180, 180)
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(46, 255, 255, 255))), (($W / 2) - 6), (($H / 2) - 6), 12, 12)

# Acentos laterales
$accent = New-Object System.Drawing.SolidBrush($orange)
$g.FillRectangle($accent, 90, 128, 14, 320)
$g.FillRectangle($accent, 0, 0, $W, 14)

# Titular
$titleFont = New-Object System.Drawing.Font("Arial Black", 104, [System.Drawing.FontStyle]::Regular)
$tagFont = New-Object System.Drawing.Font("Arial", 30, [System.Drawing.FontStyle]::Regular)
$domainFont = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Bold)

$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$orangeBrush = New-Object System.Drawing.SolidBrush($orange)
$creamBrush = New-Object System.Drawing.SolidBrush($cream)
$creamFaded = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(190, 232, 240, 236))

$futbol = "EL F$([char]0x00CD)TBOL"
$verd = "VERDADERO"
$g.DrawString($futbol, $titleFont, $white, 134, 118)
$g.DrawString($verd, $titleFont, $orangeBrush, 134, 244)

# Separador y tagline
$divider = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 232, 240, 236), 2)
$g.DrawLine($divider, 136, 424, 700, 424)
$tagline = "El f$([char]0x00FA)tbol del patio de colegio $([char]0x00B7) Entrevistas y f$([char]0x00FA)tbol base"
$g.DrawString($tagline, $tagFont, $creamBrush, 136, 448)

# Dominio abajo a la derecha, sobre la banda inferior
$domain = "www.elfutbolverdadero.com"
$size = $g.MeasureString($domain, $domainFont)
$g.DrawString($domain, $domainFont, $creamFaded, ($W - 60 - $size.Width), ($H - 84))

$g.FillRectangle($accent, 0, ($H - 22), $W, 22)

$out = Join-Path $PSScriptRoot "..\public\og.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "og.png generado en $out"
