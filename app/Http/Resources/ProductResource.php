<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'sku' => $this->sku,
            'barcode_number' => $this->barcode_number,
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->supplier ? [
                'id' => $this->supplier->id,
                'name' => $this->supplier->name,
                'mobile' => $this->supplier->mobile,
                'deleted_at' => $this->supplier->deleted_at?->toISOString(),
            ] : null,
            'category' => $this->category,
            'price' => (float) $this->price,
            'quantity' => (int) $this->quantity,
            'low_stock_threshold' => (int) $this->low_stock_threshold,
            'stock_status' => $this->stock_status,
            'description' => $this->description,
            'codes_count' => $this->whenCounted('codes'),
            'deleted_at' => $this->deleted_at?->toISOString(),
            'days_left' => $this->days_left,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
