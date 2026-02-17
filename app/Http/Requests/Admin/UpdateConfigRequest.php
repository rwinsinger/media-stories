<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConfigRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'updates' => ['required', 'array'],
            'updates.*.key' => ['required', 'string', 'exists:config,key'],
            'updates.*.value' => ['present'],
        ];
    }
}
