<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CodeResource extends JsonResource
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
            'product_id' => $this->product_id,
            'template_id' => $this->template_id,
            'template_name' => $this->template?->name ?? ($this->settings['template_name'] ?? null),
            'name' => $this->name,
            'type' => $this->type,
            'format' => $this->format,
            'value' => $this->value,
            'settings' => $this->settings,
            'preview_path' => $this->preview_path,
            'preview_url' => $this->preview_url,
            'product' => new ProductResource($this->whenLoaded('product')),
            'deleted_at' => $this->deleted_at?->toISOString(),
            'days_left' => $this->days_left,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
