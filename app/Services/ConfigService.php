<?php

namespace App\Services;

use App\Models\FeatureFlag;
use App\Models\SiteConfig;
use Illuminate\Support\Facades\Cache;

class ConfigService
{
    public function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("config.{$key}", 60, fn () => SiteConfig::query()->find($key)?->value ?? $default);
    }

    public function set(string $key, mixed $value, ?int $updatedBy = null): void
    {
        SiteConfig::query()->updateOrCreate(['key' => $key], [
            'value' => $value,
            'updated_by' => $updatedBy,
        ]);
        Cache::forget("config.{$key}");
    }

    public function isFeatureEnabled(string $key): bool
    {
        return FeatureFlag::query()->find($key)?->enabled ?? false;
    }
}
