<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateConfigRequest;
use App\Models\SiteConfig;
use App\Services\ActivityLogService;
use App\Services\ConfigService;
use Illuminate\Http\JsonResponse;

class ConfigController extends Controller
{
    public function __construct(
        private readonly ConfigService $configService,
        private readonly ActivityLogService $activityLog,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json(SiteConfig::query()->orderBy('key')->get());
    }

    public function update(UpdateConfigRequest $request): JsonResponse
    {
        $key = $request->input('key');
        $value = $request->input('value');

        $this->configService->set($key, $value, $request->user()->id);

        $this->activityLog->log(
            $request->user()->id,
            'admin.config_updated',
            'admin',
            'SiteConfig',
            $key,
            ['key' => $key, 'value' => $value],
            true,
            null,
            $request,
        );

        return response()->json(SiteConfig::query()->find($key));
    }
}
