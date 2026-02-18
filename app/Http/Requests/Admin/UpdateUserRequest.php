<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subscription_tier' => ['sometimes', 'in:free,premium'],
            'subscription_status' => ['sometimes', 'in:active,cancelled,expired'],
            'is_admin' => ['sometimes', 'boolean'],
            'is_suspended' => ['sometimes', 'boolean'],
            'suspended_reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
