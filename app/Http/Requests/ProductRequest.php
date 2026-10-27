<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProductRequest extends FormRequest
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
        $productId = $this->route('product') ? ($this->route('product')->id ?? $this->route('product')) : null;

        return [
            'name' => ['required', 'string', 'max:255'],
            'sku' => [
                'required',
                'string',
                'max:100',
                Rule::unique('products', 'sku')->whereNull('deleted_at')->ignore($productId),
            ],
            'barcode_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('products', 'barcode_number')->whereNull('deleted_at')->ignore($productId),
            ],
            'category' => ['nullable', 'string', 'max:100'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'quantity' => ['nullable', 'integer', 'min:0'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string'],
            'auto_generate_barcode' => ['nullable', 'boolean'],
            'auto_barcode_format' => ['nullable', 'string', 'in:CODE128,EAN13,EAN8,UPC'],
        ];
    }

    /**
     * Configure the validator instance with custom checks for soft-deleted items.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $productId = $this->route('product') ? ($this->route('product')->id ?? $this->route('product')) : null;

            if ($sku = $this->input('sku')) {
                $trashedSkuExists = Product::onlyTrashed()
                    ->where('sku', $sku)
                    ->when($productId, fn ($q) => $q->where('id', '!=', $productId))
                    ->exists();

                if ($trashedSkuExists) {
                    $validator->errors()->add('sku', 'This SKU exists in the Recycle Bin. Restore it instead.');
                }
            }

            if ($barcodeNumber = $this->input('barcode_number')) {
                $trashedBarcodeExists = Product::onlyTrashed()
                    ->where('barcode_number', $barcodeNumber)
                    ->when($productId, fn ($q) => $q->where('id', '!=', $productId))
                    ->exists();

                if ($trashedBarcodeExists) {
                    $validator->errors()->add('barcode_number', 'This barcode number exists in the Recycle Bin. Restore it instead.');
                }
            }
        });
    }
}
