<?php

namespace App\Services;

use App\Models\BarcodeSequence;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class BarcodeNumberGenerator
{
    /**
     * Supported format aliases normalized to standard keys.
     */
    protected array $formatAliases = [
        'EAN13' => 'EAN13',
        'EAN-13' => 'EAN13',
        'EAN8' => 'EAN8',
        'EAN-8' => 'EAN8',
        'UPC' => 'UPC',
        'UPCA' => 'UPC',
        'UPC-A' => 'UPC',
        'CODE128' => 'CODE128',
        'CODE-128' => 'CODE128',
    ];

    /**
     * Normalize format string.
     */
    public function normalizeFormat(string $format): string
    {
        $clean = strtoupper(trim($format));
        return $this->formatAliases[$clean] ?? $clean;
    }

    /**
     * Calculate GS1 check digit for given digits.
     * Works for EAN13 (12 data digits), EAN8 (7 data digits), UPC-A (11 data digits), etc.
     */
    public function checkDigit(string $format, string $digits): string
    {
        $cleanDigits = preg_replace('/\D/', '', $digits);

        if ($cleanDigits === '') {
            throw new InvalidArgumentException("Digits must contain numeric characters to compute check digit.");
        }

        $sum = 0;
        $len = strlen($cleanDigits);

        for ($i = $len - 1; $i >= 0; $i--) {
            $distFromRight = ($len - 1) - $i;
            $weight = ($distFromRight % 2 === 0) ? 3 : 1;
            $sum += (int)$cleanDigits[$i] * $weight;
        }

        return (string)((10 - ($sum % 10)) % 10);
    }

    /**
     * Validate length, digits and check digit for format.
     */
    public function isValid(string $format, string $number): bool
    {
        $details = $this->validateDetails($format, $number);
        return $details['valid'];
    }

    /**
     * Detailed validation returning validity and error messages.
     */
    public function validateDetails(string $format, string $number): array
    {
        $norm = $this->normalizeFormat($format);
        $cleanNumber = trim($number);

        switch ($norm) {
            case 'EAN13':
                if (!ctype_digit($cleanNumber)) {
                    return ['valid' => false, 'message' => 'EAN13 must contain digits only.'];
                }
                $len = strlen($cleanNumber);
                if ($len === 12) {
                    $expected = $this->checkDigit('EAN13', $cleanNumber);
                    return [
                        'valid' => false,
                        'message' => "EAN13 requires 13 digits. You entered 12 digits; correct check digit is {$expected}.",
                        'suggested_check_digit' => $expected,
                        'suggested_full_number' => $cleanNumber . $expected,
                    ];
                }
                if ($len !== 13) {
                    return ['valid' => false, 'message' => "EAN13 requires exactly 13 digits (got {$len})."];
                }
                $expected = $this->checkDigit('EAN13', substr($cleanNumber, 0, 12));
                $actual = substr($cleanNumber, 12, 1);
                if ($expected !== $actual) {
                    return [
                        'valid' => false,
                        'message' => "Invalid GS1 check digit for EAN13: expected {$expected}, got {$actual}.",
                        'suggested_check_digit' => $expected,
                        'suggested_full_number' => substr($cleanNumber, 0, 12) . $expected,
                    ];
                }
                return ['valid' => true, 'message' => 'Valid EAN13 barcode number.'];

            case 'EAN8':
                if (!ctype_digit($cleanNumber)) {
                    return ['valid' => false, 'message' => 'EAN8 must contain digits only.'];
                }
                $len = strlen($cleanNumber);
                if ($len === 7) {
                    $expected = $this->checkDigit('EAN8', $cleanNumber);
                    return [
                        'valid' => false,
                        'message' => "EAN8 requires 8 digits. You entered 7 digits; correct check digit is {$expected}.",
                        'suggested_check_digit' => $expected,
                        'suggested_full_number' => $cleanNumber . $expected,
                    ];
                }
                if ($len !== 8) {
                    return ['valid' => false, 'message' => "EAN8 requires exactly 8 digits (got {$len})."];
                }
                $expected = $this->checkDigit('EAN8', substr($cleanNumber, 0, 7));
                $actual = substr($cleanNumber, 7, 1);
                if ($expected !== $actual) {
                    return [
                        'valid' => false,
                        'message' => "Invalid GS1 check digit for EAN8: expected {$expected}, got {$actual}.",
                        'suggested_check_digit' => $expected,
                        'suggested_full_number' => substr($cleanNumber, 0, 7) . $expected,
                    ];
                }
                return ['valid' => true, 'message' => 'Valid EAN8 barcode number.'];

            case 'UPC':
                if (!ctype_digit($cleanNumber)) {
                    return ['valid' => false, 'message' => 'UPC-A must contain digits only.'];
                }
                $len = strlen($cleanNumber);
                if ($len === 11) {
                    $expected = $this->checkDigit('UPC', $cleanNumber);
                    return [
                        'valid' => false,
                        'message' => "UPC-A requires 12 digits. You entered 11 digits; correct check digit is {$expected}.",
                        'suggested_check_digit' => $expected,
                        'suggested_full_number' => $cleanNumber . $expected,
                    ];
                }
                if ($len !== 12) {
                    return ['valid' => false, 'message' => "UPC-A requires exactly 12 digits (got {$len})."];
                }
                $expected = $this->checkDigit('UPC', substr($cleanNumber, 0, 11));
                $actual = substr($cleanNumber, 11, 1);
                if ($expected !== $actual) {
                    return [
                        'valid' => false,
                        'message' => "Invalid GS1 check digit for UPC-A: expected {$expected}, got {$actual}.",
                        'suggested_check_digit' => $expected,
                        'suggested_full_number' => substr($cleanNumber, 0, 11) . $expected,
                    ];
                }
                return ['valid' => true, 'message' => 'Valid UPC-A barcode number.'];

            case 'CODE128':
                if ($cleanNumber === '') {
                    return ['valid' => false, 'message' => 'CODE128 value cannot be empty.'];
                }
                if (strlen($cleanNumber) > 80) {
                    return ['valid' => false, 'message' => 'CODE128 content is too long (max 80 chars).'];
                }
                if (preg_match('/^[\x20-\x7E]+$/', $cleanNumber) !== 1) {
                    return ['valid' => false, 'message' => 'CODE128 only supports standard ASCII characters.'];
                }
                return ['valid' => true, 'message' => 'Valid CODE128 format.'];

            default:
                if ($cleanNumber === '') {
                    return ['valid' => false, 'message' => 'Barcode value cannot be empty.'];
                }
                return ['valid' => true, 'message' => 'Format accepted.'];
        }
    }

    /**
     * Generate unique valid barcode number for format.
     */
    public function generate(string $format): string
    {
        $norm = $this->normalizeFormat($format);

        if (!in_array($norm, ['EAN13', 'EAN8', 'UPC', 'CODE128'], true)) {
            $norm = 'CODE128';
        }

        return DB::transaction(function () use ($norm) {
            // Lock or create sequence record
            $seq = BarcodeSequence::where('format', $norm)->lockForUpdate()->first();

            if (!$seq) {
                // Initialize sequence starting from current max count in products or 0
                $seq = BarcodeSequence::create([
                    'format' => $norm,
                    'last_number' => 0,
                ]);
                $seq = BarcodeSequence::where('format', $norm)->lockForUpdate()->first();
            }

            $candidate = null;
            $maxAttempts = 10000;
            $attempts = 0;

            do {
                $attempts++;
                $seq->last_number++;
                $candidate = $this->formatCandidateNumber($norm, $seq->last_number);

                // Ensure candidate does not already exist in products (including soft-deleted)
                $exists = Product::withTrashed()
                    ->where('barcode_number', $candidate)
                    ->exists();

            } while ($exists && $attempts < $maxAttempts);

            $seq->save();

            return $candidate;
        });
    }

    /**
     * Formats candidate number using configured prefixes and check digits.
     */
    protected function formatCandidateNumber(string $norm, int $sequenceNumber): string
    {
        switch ($norm) {
            case 'EAN13':
                $prefix = (string)config('barcode.company_prefix', '200');
                $seqLength = max(1, 12 - strlen($prefix));
                $padded = str_pad((string)$sequenceNumber, $seqLength, '0', STR_PAD_LEFT);
                $base12 = substr($prefix . $padded, 0, 12);
                $check = $this->checkDigit('EAN13', $base12);
                return $base12 . $check;

            case 'EAN8':
                $prefix = (string)config('barcode.ean8_prefix', '20');
                $seqLength = max(1, 7 - strlen($prefix));
                $padded = str_pad((string)$sequenceNumber, $seqLength, '0', STR_PAD_LEFT);
                $base7 = substr($prefix . $padded, 0, 7);
                $check = $this->checkDigit('EAN8', $base7);
                return $base7 . $check;

            case 'UPC':
                $prefix = (string)config('barcode.upc_prefix', '02');
                $seqLength = max(1, 11 - strlen($prefix));
                $padded = str_pad((string)$sequenceNumber, $seqLength, '0', STR_PAD_LEFT);
                $base11 = substr($prefix . $padded, 0, 11);
                $check = $this->checkDigit('UPC', $base11);
                return $base11 . $check;

            case 'CODE128':
            default:
                $prefix = (string)config('barcode.code128_prefix', 'PRD-');
                $padded = str_pad((string)$sequenceNumber, 6, '0', STR_PAD_LEFT);
                return $prefix . $padded;
        }
    }
}
