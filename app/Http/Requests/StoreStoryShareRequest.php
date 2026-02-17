<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStoryShareRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'story_id' => ['required', 'string', 'exists:stories,id'],
            'shared_with_user_id' => ['required', 'integer', 'exists:users,id'],
            'permission_level' => ['in:view,comment'],
        ];
    }
}
