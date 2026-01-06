#!/bin/bash
# Generate simple placeholder icons using ImageMagick or create base64 encoded PNGs

# Create a simple SVG icon
cat > /tmp/ytfeed-icon.svg << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="16" fill="#FF0000"/>
  <path d="M40 32 L40 96 L96 64 Z" fill="white"/>
  <circle cx="96" cy="32" r="20" fill="#3EA6FF"/>
  <path d="M88 32 L96 24 L104 32 L96 40 Z" fill="white"/>
</svg>
SVG

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    convert -background none /tmp/ytfeed-icon.svg -resize 16x16 assets/icons/icon16.png
    convert -background none /tmp/ytfeed-icon.svg -resize 48x48 assets/icons/icon48.png
    convert -background none /tmp/ytfeed-icon.svg -resize 128x128 assets/icons/icon128.png
    echo "Icons generated with ImageMagick"
else
    echo "ImageMagick not found, creating placeholder files"
    # Create minimal valid PNG files (1x1 red pixel as placeholder)
    echo -n -e '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x02\x00\x00\x00\x90\x91h6\x00\x00\x00\x1dIDAT\x08\x99c\xfc\x0f\x00\x00\xff\xff\x03\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > assets/icons/icon16.png
    echo -n -e '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x000\x00\x00\x000\x08\x02\x00\x00\x00\xd8`n\xd5\x00\x00\x00\x1dIDAT\x08\x99c\xfc\x0f\x00\x00\xff\xff\x03\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > assets/icons/icon48.png
    echo -n -e '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x80\x00\x00\x00\x80\x08\x02\x00\x00\x00L\\\xf6\x9c\x00\x00\x00\x1dIDAT\x08\x99c\xfc\x0f\x00\x00\xff\xff\x03\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > assets/icons/icon128.png
fi

rm -f /tmp/ytfeed-icon.svg
