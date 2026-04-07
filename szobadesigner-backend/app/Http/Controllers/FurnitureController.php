<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FurnitureController extends Controller
{
    public function index()
    {
        $furnitures = DB::table('furniture')->get();
        return response()->json($furnitures);
    }

    public function show($id)
    {
        $furniture = DB::table('furniture')->find($id);
        if (!$furniture) {
            return response()->json(['message' => 'Bútor nem található!'], 404);
        }
        return response()->json($furniture);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'label' => 'required|string',
            'image' => 'required|string',
            'category' => 'required|in:Konyha,Fűrdőszoba,Nappali,Hálószoba',
        ]);

        $id = DB::table('furniture')->insertGetId([
            'name' => $request->input('name'),
            'label' => $request->input('label'),
            'image' => $request->input('image'),
            'category' => $request->input('category'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Bútor sikeresen létrehozva!', 'id' => $id], 201);
    }

    public function update(Request $request, $id)
    {
        $furniture = DB::table('furniture')->find($id);
        if (!$furniture) {
            return response()->json(['message' => 'Bútor nem található!'], 404);
        }

        $request->validate([
            'name' => 'sometimes|required|string',
            'label' => 'sometimes|required|string',
            'image' => 'sometimes|required|string',
            'category' => 'sometimes|required|in:Konyha,Fűrdőszoba,Nappali,Hálószoba',
        ]);

        DB::table('furniture')->where('id', $id)->update([
            'name' => $request->input('name', $furniture->name),
            'label' => $request->input('label', $furniture->label),
            'image' => $request->input('image', $furniture->image),
            'category' => $request->input('category', $furniture->category),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Bútor sikeresen frissítve!']);
    }

    public function destroy($id)
    {
        $furniture = DB::table('furniture')->find($id);
        if (!$furniture) {
            return response()->json(['message' => 'Bútor nem található!'], 404);
        }
        DB::table('furniture')->where('id', $id)->delete();
        return response()->json(['message' => 'Bútor sikeresen törölve!']);
    }
}
