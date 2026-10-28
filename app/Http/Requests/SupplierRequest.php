<?php

namespace App\Http\Requests;

use App\Models\Supplier;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SupplierRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $supplierId = $this->route('supplier') ? ($this->route('supplier')->id ?? $this->route('supplier')) : null;

        // Sri Lankan mobile: 07XXXXXXXX, +947XXXXXXXX, 00947XXXXXXXX, or 7XXXXXXXX
        $slMobileRegex = '/^(?:\+94|0094|0)?7\d{8}$/';
        // Sri Lankan landline/phone: 0XXXXXXXXX, +94XXXXXXXXX, etc.
        $slPhoneRegex = '/^(?:\+94|0094|0)?\d{9}$/';

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('suppliers', 'name')->whereNull('deleted_at')->ignore($supplierId),
            ],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'mobile' => ['required', 'string', 'regex:' . $slMobileRegex],
            'phone' => ['nullable', 'string', 'regex:' . $slPhoneRegex],
            'email' => ['nullable', 'email', 'max:255'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'url', 'max:255'],
            'payment_terms' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
        ];
    }

    /**
     * Custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'mobile.regex' => 'The mobile number must be a valid Sri Lankan mobile number (e.g., 0771234567 or +94771234567).',
            'phone.regex' => 'The phone number must be a valid Sri Lankan phone number (e.g., 0112345678 or +94112345678).',
            'website.url' => 'The website must be a valid URL starting with http:// or https://.',
        ];
    }

    /**
     * Configure the validator instance with custom checks for soft-deleted items.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $supplierId = $this->route('supplier') ? ($this->route('supplier')->id ?? $this->route('supplier')) : null;

            if ($name = $this->input('name')) {
                $trashedExists = Supplier::onlyTrashed()
                    ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                    ->when($supplierId, fn ($q) => $q->where('id', '!=', $supplierId))
                    ->exists();

                if ($trashedExists) {
                    $validator->errors()->add('name', 'This supplier exists in the Recycle Bin. Restore it instead.');
                }
            }
        });
    }
}
