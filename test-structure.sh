#!/bin/bash
echo "🧪 Testing Monorepo Structure"
echo "=============================="
echo ""

# Check workspace packages
echo "📦 Checking workspace packages..."
if [ -f "pnpm-workspace.yaml" ]; then
    echo "✅ pnpm-workspace.yaml exists"
else
    echo "❌ pnpm-workspace.yaml missing"
fi

# Check turbo config
if [ -f "turbo.json" ]; then
    echo "✅ turbo.json exists"
else
    echo "❌ turbo.json missing"
fi

# Check apps
echo ""
echo "🏗️  Checking apps..."
for app in headshot-studio instagram-automation; do
    if [ -d "apps/$app" ]; then
        echo "✅ apps/$app exists"
        if [ -f "apps/$app/package.json" ]; then
            echo "  ✅ package.json found"
        else
            echo "  ❌ package.json missing"
        fi
    else
        echo "❌ apps/$app missing"
    fi
done

# Check packages
echo ""
echo "📦 Checking packages..."
for pkg in database shared; do
    if [ -d "packages/$pkg" ]; then
        echo "✅ packages/$pkg exists"
        if [ -f "packages/$pkg/package.json" ]; then
            echo "  ✅ package.json found"
        else
            echo "  ❌ package.json missing"
        fi
    else
        echo "❌ packages/$pkg missing"
    fi
done

# Check Prisma schema
echo ""
echo "🗄️  Checking database..."
if [ -f "packages/database/prisma/schema.prisma" ]; then
    echo "✅ Prisma schema exists"
else
    echo "❌ Prisma schema missing"
fi

# Check environment
echo ""
echo "🔐 Checking environment..."
if [ -f ".env.example" ]; then
    echo "✅ .env.example exists"
else
    echo "❌ .env.example missing"
fi

echo ""
echo "✨ Structure check complete!"
