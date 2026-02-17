<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:102400'],
        ];
    }

    public function validateMagicBytes(): bool
    {
        $file = $this->file('file');

        if (! $file) {
            return false;
        }

        $handle = fopen($file->getPathname(), 'rb');
        $bytes = fread($handle, 12);
        fclose($handle);

        $hex = bin2hex($bytes);

        $signatures = [
            'ffd8ff',           // JPEG
            '89504e47',         // PNG
            '47494638',         // GIF
            '52494646',         // WebP (RIFF)
            '000000',           // MP4/WebM (ftyp box)
            '1a45dfa3',         // WebM (EBML)
        ];

        foreach ($signatures as $sig) {
            if (str_starts_with($hex, $sig)) {
                return true;
            }
        }

        // WebP check: RIFF????WEBP
        if (str_starts_with($hex, '52494646') && substr($hex, 16, 8) === '57454250') {
            return true;
        }

        return false;
    }
}
