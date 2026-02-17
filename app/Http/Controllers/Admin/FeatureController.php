<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateFeatureFlagRequest;
use App\Models\FeatureFlag;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;

class FeatureController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function index(): JsonResponse
    {
        return response()->json(FeatureFlag::query()->orderBy('key')->get());
    }

    public function update(UpdateFeatureFlagRequest $request, string $key): JsonResponse
    {
        $flag = FeatureFlag::query()->findOrFail($key);
        $flag->update(array_merge($request->validated(), ['updated_by' => $request->user()->id]));

        $this->activityLog->log(
            $request->user()->id,
            'admin.feature_updated',
            'admin',
            'FeatureFlag',
            $key,
            $request->validated(),
            true,
            null,
            $request,
        );

        return response()->json($flag);
    }
}
