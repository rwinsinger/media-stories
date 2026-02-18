<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFrameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'media_type' => ['sometimes', 'in:image,video,audio'],
            'media_url' => ['sometimes', 'string', 'max:1000'],
            'text_content' => ['nullable', 'string', 'max:1000'],
            'thumbnail_url' => ['nullable', 'string', 'max:1000'],
            'audio_url' => ['nullable', 'string', 'max:1000'],
            'duration' => ['sometimes', 'integer', 'min:1000', 'max:3600000'],
            'order_index' => ['integer', 'min:0'],
        ];
    }
}
