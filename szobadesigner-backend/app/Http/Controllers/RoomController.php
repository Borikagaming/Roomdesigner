<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function save(Request $request)
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Csak bejelentkezett felhasznalo menthet szobat.'], 401);
        }

        if (! $request->has('layout_data')) {
            return response()->json(['message' => 'Hianyzik a szoba terve.'], 400);
        }

        $room = new Room();
        $room->user_id = $request->user()->id;
        $room->name = trim((string) $request->input('name', '')) ?: 'Nevtelen szoba';
        $room->layout_data = $request->input('layout_data');
        $room->save();

        return response()->json([
            'message' => 'Sikeres mentes.',
            'id' => $room->id,
            'room' => $room,
        ], 201);
    }

    public function index()
    {
        $rooms = Room::all();

        return response()->json(['data' => $rooms, 'message' => 'Sikeres lekeres.'], 200);
    }

    public function show(string $id)
    {
        $room = Room::find($id);
        if (! $room) {
            return response()->json(['message' => 'Szoba nem talalhato.'], 404);
        }

        return response()->json(['data' => $room, 'message' => 'Sikeres lekeres.'], 200);
    }

    public function myRooms(Request $request)
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Bejelentkezes szukseges.'], 401);
        }

        $rooms = Room::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get(['id', 'name', 'created_at', 'updated_at']);

        return response()->json(['data' => $rooms, 'message' => 'Sikeres lekeres.'], 200);
    }

    public function showMine(Request $request, string $id)
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Bejelentkezes szukseges.'], 401);
        }

        $room = Room::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($id)
            ->first();

        if (! $room) {
            return response()->json(['message' => 'A keresett szoba nem talalhato.'], 404);
        }

        return response()->json(['data' => $room, 'message' => 'Sikeres lekeres.'], 200);
    }

    public function findByName(Request $request)
    {
        $name = trim((string) $request->query('name', ''));
        if ($name === '') {
            return response()->json(['message' => 'A szoba neve kotelezo.'], 400);
        }

        $room = Room::where('name', $name)->latest('id')->first();
        if (! $room) {
            return response()->json(['message' => 'Szoba nem talalhato.'], 404);
        }

        return response()->json(['data' => $room, 'message' => 'Sikeres lekerdezes.'], 200);
    }

    public function update(Request $request, string $id)
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Bejelentkezes szukseges.'], 401);
        }

        $room = Room::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($id)
            ->first();

        if (! $room) {
            return response()->json(['message' => 'Szoba nem talalhato.'], 404);
        }

        $room->name = trim((string) $request->input('name', $room->name)) ?: $room->name;
        $room->layout_data = $request->input('layout_data', $room->layout_data);
        $room->save();

        return response()->json(['message' => 'Sikeres frissites.']);
    }

    public function destroy(Request $request, string $id)
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Bejelentkezes szukseges.'], 401);
        }

        $room = Room::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($id)
            ->first();

        if (! $room) {
            return response()->json(['message' => 'Szoba nem talalhato.'], 404);
        }

        $room->delete();

        return response()->json(['message' => 'Sikeres torles.'], 200);
    }
}
