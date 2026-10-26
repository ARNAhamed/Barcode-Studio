<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CodeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('settings') && is_string($this->input('settings'))) {
            $decoded = json_decode($this->input('settings'), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $this->merge(['settings' => $decoded]);
            }
        }
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'product_id' => ['nullable', 'exists:products,id'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:barcode,qr'],
            'format' => ['required', 'string', 'max:50'],
            'value' => ['required', 'string'],
            'settings' => ['required'],
            'preview' => ['nullable', 'file', 'image', 'max:5120'],
        ];
    }
}
