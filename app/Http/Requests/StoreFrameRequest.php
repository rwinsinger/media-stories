<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFrameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'media_type' => ['required', 'in:image,video,audio'],
            'media_url' => ['required', 'string', 'max:1000'],
            'caption' => ['nullable', 'string', 'max:500'],
            'duration' => ['integer', 'min:1000', 'max:3600000'],
            'order_index' => ['integer', 'min:0'],
        ];
    }
}
