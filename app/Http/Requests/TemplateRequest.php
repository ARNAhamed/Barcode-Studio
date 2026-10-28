<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TemplateRequest extends FormRequest
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
                // Ensure value is not saved in template settings
                unset($decoded['value']);
                $this->merge(['settings' => $decoded]);
            }
        } elseif ($this->has('settings') && is_array($this->input('settings'))) {
            $settings = $this->input('settings');
            unset($settings['value']);
            $this->merge(['settings' => $settings]);
        }

        if ($this->has('is_default')) {
            $this->merge([
                'is_default' => filter_var($this->input('is_default'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $template = $this->route('template');
        $templateId = is_object($template) ? $template->id : $template;
        $type = $this->input('type') ?? ($template ? $template->type : null);

        $nameRule = Rule::unique('templates', 'name')
            ->where(fn ($query) => $query->where('type', $type)->whereNull('deleted_at'));

        if ($templateId) {
            $nameRule->ignore($templateId);
        }

        return [
            'name' => ['required', 'string', 'max:255', $nameRule],
            'type' => [$this->isMethod('post') && ! $templateId ? 'required' : 'sometimes', 'in:barcode,qr'],
            'description' => ['nullable', 'string', 'max:1000'],
            'settings' => ['required'],
            'thumbnail' => ['nullable', 'file', 'image', 'max:5120'],
            'is_default' => ['nullable', 'boolean'],
        ];
    }
}
