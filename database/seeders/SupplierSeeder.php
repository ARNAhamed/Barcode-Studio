<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $suppliers = [
            [
                'name' => 'Lanka Office Supplies Ltd',
                'contact_person' => 'Rohan Perera',
                'mobile' => '0771234567',
                'phone' => '0112456789',
                'email' => 'rohan@lankaoffice.lk',
                'address_line1' => 'No. 45, Galle Road',
                'address_line2' => 'Kollupitiya',
                'city' => 'Colombo',
                'postal_code' => '00300',
                'country' => 'Sri Lanka',
                'website' => 'https://lankaoffice.lk',
                'payment_terms' => '30 days',
                'notes' => 'Primary supplier for office stationery, electronics accessories, and barcode supplies.',
                'status' => 'active',
            ],
            [
                'name' => 'Ceylon Tech Distributors',
                'contact_person' => 'Kusal Mendis',
                'mobile' => '0718765432',
                'phone' => '0112876543',
                'email' => 'sales@ceylontech.lk',
                'address_line1' => '120, Nawala Road',
                'address_line2' => 'Nugegoda',
                'city' => 'Colombo',
                'postal_code' => '10250',
                'country' => 'Sri Lanka',
                'website' => 'https://ceylontech.lk',
                'payment_terms' => '15 days',
                'notes' => 'Authorized dealer for computer peripherals, audio equipment, and wireless devices.',
                'status' => 'active',
            ],
            [
                'name' => 'Serendib Packaging & Labels',
                'contact_person' => 'Dilani Wickramasinghe',
                'mobile' => '0752345678',
                'phone' => '0312234567',
                'email' => 'dilani@serendibpackaging.com',
                'address_line1' => '88, Negombo Industrial Zone',
                'address_line2' => 'Katunayake',
                'city' => 'Negombo',
                'postal_code' => '11450',
                'country' => 'Sri Lanka',
                'website' => 'https://serendibpackaging.com',
                'payment_terms' => '45 days',
                'notes' => 'Supplies thermal rolls, adhesive barcode labels, and durable cardboard packaging materials.',
                'status' => 'active',
            ],
            [
                'name' => 'Kandy Mountain Textiles',
                'contact_person' => 'Chaminda Fernando',
                'mobile' => '0783456789',
                'phone' => '0812345678',
                'email' => 'chaminda@kandytextiles.lk',
                'address_line1' => '34, William Gopallawa Mawatha',
                'address_line2' => 'Peradeniya',
                'city' => 'Kandy',
                'postal_code' => '20000',
                'country' => 'Sri Lanka',
                'website' => 'https://kandytextiles.lk',
                'payment_terms' => '30 days',
                'notes' => 'Manufacturer of cotton apparel, crewneck tees, hoodies, and employee merchandise.',
                'status' => 'active',
            ],
            [
                'name' => 'Island Logistics & Wholesale',
                'contact_person' => 'Fathima Rizwan',
                'mobile' => '0764567890',
                'phone' => '0912234567',
                'email' => 'contact@islandwholesale.lk',
                'address_line1' => '15/A, Matara Road',
                'address_line2' => 'Magalle',
                'city' => 'Galle',
                'postal_code' => '80000',
                'country' => 'Sri Lanka',
                'website' => 'https://islandwholesale.lk',
                'payment_terms' => 'Net 7 days',
                'notes' => 'Regional general distributor in Southern Province. Accounts undergoing quarterly audit.',
                'status' => 'inactive',
            ],
        ];

        $createdSuppliers = [];
        foreach ($suppliers as $data) {
            $createdSuppliers[] = Supplier::firstOrCreate(
                ['name' => $data['name']],
                $data
            );
        }

        // Link existing products to suppliers
        // Leave a couple of products without a supplier so unassigned products is realistic
        $products = Product::orderBy('id')->get();
        if ($products->isNotEmpty()) {
            foreach ($products as $index => $product) {
                // Keep product index 0 or 4 unassigned to have products without a supplier
                if ($index === 0 || $index === 5) {
                    continue;
                }

                if ($product->category === 'Electronics') {
                    $supplier = ($index % 2 === 0) ? $createdSuppliers[1] : $createdSuppliers[0];
                } elseif ($product->category === 'Apparel') {
                    $supplier = $createdSuppliers[3];
                } else {
                    $supplier = $createdSuppliers[$index % count($createdSuppliers)];
                }

                $product->update(['supplier_id' => $supplier->id]);
            }
        }
    }
}
