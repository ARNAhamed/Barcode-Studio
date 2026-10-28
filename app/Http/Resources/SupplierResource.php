<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupplierResource extends JsonResource
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
            'contact_person' => $this->contact_person,
            'mobile' => $this->mobile,
            'phone' => $this->phone,
            'email' => $this->email,
            'address_line1' => $this->address_line1,
            'address_line2' => $this->address_line2,
            'city' => $this->city,
            'postal_code' => $this->postal_code,
            'country' => $this->country ?? 'Sri Lanka',
            'website' => $this->website,
            'payment_terms' => $this->payment_terms,
            'notes' => $this->notes,
            'status' => $this->status ?? 'active',
            'products_count' => $this->whenCounted('products', fn() => $this->products_count),
            'products' => ProductResource::collection($this->whenLoaded('products')),
            'deleted_at' => $this->deleted_at?->toISOString(),
            'days_left' => $this->days_left,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
