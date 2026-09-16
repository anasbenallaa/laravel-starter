#!/bin/sh
set -e

echo "🚀 Starter — Starting production deployment..."

# ─── Laravel Optimizations ───────────────────────────────────────────
echo "⚡ Caching configuration..."
php artisan config:cache

echo "⚡ Caching routes..."
php artisan route:cache

echo "⚡ Caching views..."
php artisan view:cache

echo "⚡ Caching events..."
php artisan event:cache

# ─── Database Migrations ─────────────────────────────────────────────
echo "🗄️  Running database migrations..."
php artisan migrate --force --no-interaction

echo "🔐 Synchronizing permissions..."
php artisan permissions:sync --no-interaction

echo "📊 Publishing Horizon assets..."
php artisan horizon:publish --no-interaction 2>/dev/null || true

# ─── Start Supervisor ────────────────────────────────────────────────
echo "✅ All optimizations complete. Starting services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf