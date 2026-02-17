<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Laravel\Facades\Image;

class ImageProcessorController extends Controller
{
    public function process(Request $request): JsonResponse
    {
        $request->validate([
            'path' => ['required', 'string'],
            'operation' => ['required', 'in:rotate_left,rotate_right,rotate_180,crop'],
            'quality' => ['nullable', 'integer', 'min:20', 'max:100'],
            'crop_x' => ['nullable', 'numeric'],
            'crop_y' => ['nullable', 'numeric'],
            'crop_width' => ['nullable', 'numeric'],
            'crop_height' => ['nullable', 'numeric'],
        ]);

        $user = $request->user();
        $path = $request->input('path');

        if (! str_contains($path, "/{$user->id}/")) {
            return response()->json(['message' => 'Unauthorized file access.'], 403);
        }

        $contents = Storage::disk('media')->get($path);
        if (! $contents) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $image = Image::read($contents);

        match ($request->input('operation')) {
            'rotate_left' => $image->rotate(90),
            'rotate_right' => $image->rotate(-90),
            'rotate_180' => $image->rotate(180),
            'crop' => $image->crop(
                (int) $request->input('crop_width'),
                (int) $request->input('crop_height'),
                (int) $request->input('crop_x'),
                (int) $request->input('crop_y'),
            ),
        };

        $quality = $request->integer('quality', 85);
        $ext = pathinfo($path, PATHINFO_EXTENSION);
        $newPath = pathinfo($path, PATHINFO_DIRNAME).'/'.Str::random(8).'.'.$ext;

        Storage::disk('media')->put($newPath, $image->toJpeg($quality)->toString());

        return response()->json([
            'url' => Storage::disk('media')->url($newPath),
            'path' => $newPath,
        ]);
    }
}
