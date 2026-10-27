<?php

namespace Tests\Unit;

use App\Services\BarcodeNumberGenerator;
use Tests\TestCase;

class BarcodeNumberGeneratorTest extends TestCase
{
    protected BarcodeNumberGenerator $generator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->generator = new BarcodeNumberGenerator();
    }

    /**
     * Test known EAN-13 barcodes with verified GS1 check digits.
     */
    public function test_ean13_known_check_digits(): void
    {
        // 4006381333931 (Stabilo Boss highlighter) -> check digit 1
        $this->assertSame('1', $this->generator->checkDigit('EAN13', '400638133393'));
        $this->assertTrue($this->generator->isValid('EAN13', '4006381333931'));

        // 73513537 (invalid length 8 for EAN13)
        $this->assertFalse($this->generator->isValid('EAN13', '73513537'));

        // Invalid check digit: 4006381333932 (ends in 2 instead of 1)
        $this->assertFalse($this->generator->isValid('EAN13', '4006381333932'));

        // Another known standard: 8901234567890 -> base 890123456789, check digit 0
        $this->assertSame('0', $this->generator->checkDigit('EAN13', '890123456789'));
        $this->assertTrue($this->generator->isValid('EAN13', '8901234567890'));

        // 9780141036144 (Penguin Books 1984 ISBN-13)
        $this->assertSame('4', $this->generator->checkDigit('EAN13', '978014103614'));
        $this->assertTrue($this->generator->isValid('EAN13', '9780141036144'));
    }

    /**
     * Test known EAN-8 barcodes with verified GS1 check digits.
     */
    public function test_ean8_known_check_digits(): void
    {
        // 96385074 -> base 9638507, check digit 4
        $this->assertSame('4', $this->generator->checkDigit('EAN8', '9638507'));
        $this->assertTrue($this->generator->isValid('EAN8', '96385074'));

        // Invalid check digit
        $this->assertFalse($this->generator->isValid('EAN8', '96385075'));
    }

    /**
     * Test known UPC-A barcodes with verified GS1 check digits.
     */
    public function test_upc_known_check_digits(): void
    {
        // 036000291452 (Kleenex) -> base 03600029145, check digit 2
        $this->assertSame('2', $this->generator->checkDigit('UPC', '03600029145'));
        $this->assertTrue($this->generator->isValid('UPC', '036000291452'));

        // Invalid check digit
        $this->assertFalse($this->generator->isValid('UPC', '036000291450'));
    }

    /**
     * Test CODE-128 validation.
     */
    public function test_code128_validation(): void
    {
        $this->assertTrue($this->generator->isValid('CODE128', 'PRD-000001'));
        $this->assertTrue($this->generator->isValid('CODE128', 'AUD-WNC-001'));
        $this->assertFalse($this->generator->isValid('CODE128', ''));
    }

    /**
     * Test validation details response helper with 12-digit EAN-13 suggestion.
     */
    public function test_validate_details_suggests_check_digit(): void
    {
        $details = $this->generator->validateDetails('EAN13', '400638133393');
        $this->assertFalse($details['valid']);
        $this->assertSame('1', $details['suggested_check_digit']);
        $this->assertSame('4006381333931', $details['suggested_full_number']);
    }
}
