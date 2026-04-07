<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\FurnitureController;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/banned-emails/appeal', [AuthController::class, 'submitBanAppeal']);
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthorized'], 401);
})->name('login');
//room routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/rooms/save', [RoomController::class, 'save']);
    Route::get('/rooms/mine', [RoomController::class, 'myRooms']);
    Route::get('/rooms/mine/{id}', [RoomController::class, 'showMine']);
    Route::put('/rooms/{id}', [RoomController::class, 'update']);
    Route::delete('/rooms/{id}', [RoomController::class, 'destroy']);

    Route::prefix('admin')->group(function () {
        Route::get('/users', [AdminController::class, 'listUsers']);
        Route::get('/users/{userId}/rooms/{roomId}', [AdminController::class, 'showUserRoom']);
        Route::post('/users/{userId}/ban', [AdminController::class, 'banUser']);
        Route::delete('/banned-emails/{banId}', [AdminController::class, 'unbanUser']);
    });
});
Route::get('/rooms/find/by-name', [RoomController::class, 'findByName']);
Route::get('/rooms/{id}', [RoomController::class, 'show']);
Route::get('/rooms', [RoomController::class, 'index']);
//furniture routes
Route::get('/furniture', [FurnitureController::class, 'index']);
Route::get('/furniture/{id}', [FurnitureController::class, 'show']);
Route::post('/furniture', [FurnitureController::class, 'store']);
Route::put('/furniture/{id}', [FurnitureController::class, 'update']);
Route::delete('/furniture/{id}', [FurnitureController::class, 'destroy']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
Route::middleware('auth:sanctum')->put('/user/update', [AuthController::class, 'updateProfile']);
Route::middleware('auth:sanctum')->delete('/user/delete', [AuthController::class, 'deleteProfile']);
