<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FurnitureSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $furniture = [
            // Konyha
            ['name' => 'dining table', 'label' => 'Ebédlő asztal', 'image' => '/furniture/dining_table.png', 'category' => 'Konyha'],
            ['name' => 'large dining table', 'label' => 'Nagy ebédlő asztal', 'image' => '/furniture/xl_dining_table.png', 'category' => 'Konyha'],
            ['name' => 'Oven', 'label' => 'Sütő', 'image' => '/furniture/oven.png', 'category' => 'Konyha'],
            ['name' => 'Microwave', 'label' => 'Mikró', 'image' => '/furniture/microwave.png', 'category' => 'Konyha'],
            ['name' => 'Fridge', 'label' => 'Hűtő', 'image' => '/furniture/fridge.png', 'category' => 'Konyha'],
            ['name' => 'Kitchen Sink', 'label' => 'Konyhai mosogató', 'image' => '/furniture/kitchen_sink.png', 'category' => 'Konyha'],
            ['name' => 'Counter', 'label' => 'Pult', 'image' => '/furniture/counter.png', 'category' => 'Konyha'],
            ['name' => 'Round table', 'label' => 'Kerek asztal', 'image' => '/furniture/round_table.png', 'category' => 'Konyha'],

            // Fűrdőszoba
            ['name' => 'sink', 'label' => 'Mosdó', 'image' => '/furniture/sink.png', 'category' => 'Fűrdőszoba'],
            ['name' => 'toilet', 'label' => 'Toalett', 'image' => '/furniture/toilet.png', 'category' => 'Fűrdőszoba'],
            ['name' => 'bathtub', 'label' => 'Kád', 'image' => '/furniture/bathtub.png', 'category' => 'Fűrdőszoba'],
            ['name' => 'bidet', 'label' => 'Bidé', 'image' => '/furniture/bidet.png', 'category' => 'Fűrdőszoba'],
            ['name' => 'shower', 'label' => 'Zuhanyzó', 'image' => '/furniture/shower.png', 'category' => 'Fűrdőszoba'],
            ['name' => 'washing machine', 'label' => 'Mosógép', 'image' => '/furniture/washing_machine.png', 'category' => 'Fűrdőszoba'],
            ['name' => 'medicine cabinet', 'label' => 'Szekrény', 'image' => '/furniture/medicine_cabinet.png', 'category' => 'Fűrdőszoba'],

            // Nappali
            ['name' => 'sofa', 'label' => 'Szófa', 'image' => '/furniture/sofa.png', 'category' => 'Nappali'],
            ['name' => 'table', 'label' => 'Asztal', 'image' => '/furniture/livingroom_table.png', 'category' => 'Nappali'],
            ['name' => 'couch', 'label' => 'Kanapé', 'image' => '/furniture/couch.png', 'category' => 'Nappali'],
            ['name' => 'chair', 'label' => 'Irodai Szék', 'image' => '/furniture/gamingchair.png', 'category' => 'Nappali'],
            ['name' => 'footrest', 'label' => 'Lábtartó', 'image' => '/furniture/footrest.png', 'category' => 'Nappali'],
            ['name' => 'cafetable', 'label' => 'Kávézóasztal', 'image' => '/furniture/mini_cafetable.png', 'category' => 'Nappali'],
            ['name' => 'TV', 'label' => 'TV', 'image' => '/furniture/tv.png', 'category' => 'Nappali'],
            ['name' => 'table', 'label' => 'Asztal', 'image' => '/furniture/table.png', 'category' => 'Nappali'],
            ['name' => 'door', 'label' => 'Ajtó', 'image' => '/furniture/door.png', 'category' => 'Nappali'],
            ['name' => 'window', 'label' => 'Ablak', 'image' => '/furniture/window.png', 'category' => 'Nappali'],

            // Hálószoba
            ['name' => 'wardrobe', 'label' => 'Szekrény', 'image' => '/furniture/wardrobe.png', 'category' => 'Hálószoba'],
            ['name' => 'bed', 'label' => 'Ágy', 'image' => '/furniture/bed.png', 'category' => 'Hálószoba'],
            ['name' => 'redbed', 'label' => 'Piros ágy', 'image' => '/furniture/redbed.png', 'category' => 'Hálószoba'],
            ['name' => 'singlebed', 'label' => 'Egyszemélyes ágy', 'image' => '/furniture/singlebed.png', 'category' => 'Hálószoba'],
            ['name' => 'nightstand', 'label' => 'Éjjeliszekrény', 'image' => '/furniture/nightstand.png', 'category' => 'Hálószoba'],
            ['name' => 'lamp', 'label' => 'Lámpa', 'image' => '/furniture/lamp.png', 'category' => 'Hálószoba'],
        ];

        foreach ($furniture as $item) {
            DB::table('furniture')->insert($item);
        }
    }
}
