# Mechanical, lossless crops of artwork authored in ChatGPT. No redrawing.
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path $PSScriptRoot
$destination = Join-Path $projectRoot 'public/companion/rig'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
function Export-Crop($source, $name, $x, $y, $width, $height) {
 $bitmap = [Drawing.Bitmap]::FromFile((Join-Path $projectRoot $source))
 try {
  $crop = $bitmap.Clone([Drawing.Rectangle]::new($x,$y,$width,$height),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try { $crop.Save((Join-Path $destination $name),[Drawing.Imaging.ImageFormat]::Png) } finally { $crop.Dispose() }
 } finally { $bitmap.Dispose() }
}
Export-Crop 'design/mascot-rig/eyes-clean-source.png' 'sclera.png' 570 170 130 60
Export-Crop 'design/mascot-rig/closed-eyes-source.png' 'lids.png' 570 170 130 60
Export-Crop 'public/homepage/welcome.png' 'iris-left.png' 588 177 24 24
Export-Crop 'public/homepage/welcome.png' 'iris-right.png' 655 193 28 28
Export-Crop 'public/homepage/welcome.png' 'head.png' 480 20 280 390
Copy-Item -LiteralPath (Join-Path $projectRoot 'design/mascot-wardrobe/forest-suit-open-collar.png') -Destination (Join-Path $destination 'master.png')
if(Test-Path (Join-Path $projectRoot 'design/mascot-rig/body-neck-source.png')) {
 Export-Crop 'design/mascot-rig/body-neck-source.png' 'neck.png' 490 235 200 115
}
