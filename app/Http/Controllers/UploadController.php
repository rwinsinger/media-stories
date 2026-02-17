<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function store(UploadRequest $request): JsonResponse
    {
        if (! $request->validateMagicBytes()) {
            return response()->json(['message' => 'Invalid file type detected.'], 422);
        }

        $file = $request->file('file');
        $user = $request->user();
        $mime = $file->getMimeType() ?? '';
        $ext = $file->getClientOriginalExtension();

        $type = match (true) {
            str_starts_with($mime, 'video/') => 'videos',
            str_starts_with($mime, 'audio/') => 'audio',
            default => 'images',
        };

        $path = "{$type}/{$user->id}/".time().'-'.Str::random(8).".{$ext}";
        Storage::disk('media')->put($path, file_get_contents($file->getPathname()));

        return response()->json([
            'url' => Storage::disk('media')->url($path),
            'path' => $path,
        ]);
    }
}
