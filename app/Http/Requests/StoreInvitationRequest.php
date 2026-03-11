<?php

namespace App\Http\Requests;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'email',
                Rule::notIn(
                    User::query()->pluck('email')->toArray()
                ),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.not_in' => 'This email address is already registered. Try adding them as a friend directly.',
        ];
    }

    public function withValidator(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Contracts\Validation\Validator $validator): void {
            if ($validator->errors()->has('email')) {
                return;
            }

            $alreadyInvited = Invitation::query()
                ->where('invited_by', $this->user()->id)
                ->where('email', $this->input('email'))
                ->pending()
                ->exists();

            if ($alreadyInvited) {
                $validator->errors()->add('email', 'You already have a pending invitation for this email address.');
            }
        });
    }
}
