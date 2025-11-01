#!/bin/bash

echo "🔍 Verifying All Pasted Content Implementation"
echo "=============================================="
echo ""

# Map pasted content files to their expected locations
declare -A file_map=(
    ["pasted_content_2.txt"]="packages/shared/src/schemas.ts"
    ["pasted_content_3.txt"]="apps/headshot-studio/src/services/claude-vision.service.ts"
    ["pasted_content_4.txt"]="packages/shared/src/replicate.ts"
    ["pasted_content_5.txt"]="packages/shared/src/constants.ts"
    ["pasted_content_6.txt"]="packages/shared/src/schemas.ts (duplicate)"
    ["pasted_content_7.txt"]="apps/headshot-studio/src/services/claude-vision.service.ts (duplicate)"
    ["pasted_content_8.txt"]="packages/shared/src/replicate.ts (duplicate)"
    ["pasted_content_9.txt"]="apps/headshot-studio/src/services/cloudinary.service.ts"
    ["pasted_content_10.txt"]="apps/headshot-studio/src/services/project.service.ts"
    ["pasted_content_11.txt"]="apps/headshot-studio/src/services/payment.service.ts"
    ["pasted_content_12.txt"]="apps/headshot-studio/src/services/payment.service.ts (duplicate)"
    ["pasted_content_13.txt"]="apps/headshot-studio/src/routers/main.router.ts"
    ["pasted_content_14.txt"]="apps/headshot-studio/src/index.ts"
    ["pasted_content_15.txt"]="README_HEADSHOT.md"
)

echo "📋 Checking implementation status:"
echo ""

for pasted_file in "${!file_map[@]}"; do
    expected_location="${file_map[$pasted_file]}"
    
    # Remove "(duplicate)" suffix for actual file check
    actual_file=$(echo "$expected_location" | sed 's/ (duplicate)//')
    
    if [ -f "$actual_file" ]; then
        echo "✅ $pasted_file → $expected_location"
    else
        echo "❌ MISSING: $pasted_file → $expected_location"
    fi
done

echo ""
echo "📁 Checking directory structure:"
echo ""

# Check critical directories
dirs=(
    "apps/headshot-studio/src/services"
    "apps/headshot-studio/src/routers"
    "apps/instagram-automation/client"
    "apps/instagram-automation/server"
    "packages/database/prisma"
    "packages/shared/src"
)

for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        file_count=$(find "$dir" -type f | wc -l)
        echo "✅ $dir ($file_count files)"
    else
        echo "❌ MISSING: $dir"
    fi
done

echo ""
echo "🔧 Checking service files:"
ls -1 apps/headshot-studio/src/services/*.ts 2>/dev/null || echo "No service files found"

echo ""
echo "🛣️  Checking router files:"
ls -1 apps/headshot-studio/src/routers/*.ts 2>/dev/null || echo "No router files found"

echo ""
echo "✨ Verification complete!"
