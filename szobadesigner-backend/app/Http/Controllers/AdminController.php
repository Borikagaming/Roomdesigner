<?php

namespace App\Http\Controllers;

use App\Models\BannedEmail;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    private function getAdminUser(Request $request): ?User
    {
        $user = $request->user();

        return $user && $user->is_admin ? $user : null;
    }

    private function unauthorizedResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'Ehhez a művelethez admin jogosultság szükséges.',
        ], 403);
    }

    private function serializeBannedEmail(BannedEmail $bannedEmail): array
    {
        return [
            'id' => $bannedEmail->id,
            'email' => $bannedEmail->email,
            'archived_name' => $bannedEmail->archived_name,
            'archived_username' => $bannedEmail->archived_username,
            'reason' => $bannedEmail->reason,
            'appeal_message' => $bannedEmail->appeal_message,
            'appeal_submitted_at' => $bannedEmail->appeal_submitted_at,
            'created_at' => $bannedEmail->created_at,
            'updated_at' => $bannedEmail->updated_at,
            'banned_by_name' => $bannedEmail->bannedBy?->name,
            'can_restore_user' => ! empty($bannedEmail->archived_password) && ! empty($bannedEmail->archived_name),
        ];
    }

    public function listUsers(Request $request): JsonResponse
    {
        $admin = $this->getAdminUser($request);
        if (! $admin) {
            return $this->unauthorizedResponse();
        }

        $users = User::query()
            ->with(['rooms' => function ($query) {
                $query
                    ->select('id', 'user_id', 'name', 'created_at', 'updated_at')
                    ->orderByDesc('updated_at')
                    ->orderByDesc('id');
            }])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'profile_image' => $user->profile_image,
                    'is_admin' => (bool) $user->is_admin,
                    'room_count' => $user->rooms->count(),
                    'rooms' => $user->rooms->map(fn (Room $room) => [
                        'id' => $room->id,
                        'name' => $room->name,
                        'created_at' => $room->created_at,
                        'updated_at' => $room->updated_at,
                    ])->values(),
                ];
            })
            ->values();

        $bannedEmails = BannedEmail::query()
            ->with('bannedBy:id,name')
            ->orderByDesc('appeal_submitted_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (BannedEmail $bannedEmail) => $this->serializeBannedEmail($bannedEmail))
            ->values();

        return response()->json([
            'data' => $users,
            'banned_emails' => $bannedEmails,
        ]);
    }

    public function showUserRoom(Request $request, string $userId, string $roomId): JsonResponse
    {
        $admin = $this->getAdminUser($request);
        if (! $admin) {
            return $this->unauthorizedResponse();
        }

        $room = Room::query()
            ->where('user_id', $userId)
            ->whereKey($roomId)
            ->first();

        if (! $room) {
            return response()->json([
                'message' => 'A keresett szoba nem található.',
            ], 404);
        }

        return response()->json([
            'data' => $room,
        ]);
    }

    public function banUser(Request $request, string $userId): JsonResponse
    {
        $admin = $this->getAdminUser($request);
        if (! $admin) {
            return $this->unauthorizedResponse();
        }

        $reason = trim((string) $request->input('reason', ''));
        if ($reason === '') {
            return response()->json([
                'message' => 'A bannolás indokának megadása kötelező.',
            ], 422);
        }

        $user = User::query()->withCount('rooms')->find($userId);
        if (! $user) {
            return response()->json([
                'message' => 'A felhasználó nem található.',
            ], 404);
        }

        if ($user->id === $admin->id) {
            return response()->json([
                'message' => 'A saját admin fiók nem bannolható.',
            ], 400);
        }

        if ($user->is_admin) {
            return response()->json([
                'message' => 'Másik admin fiók nem bannolható ezen a felületen.',
            ], 400);
        }

        BannedEmail::query()->updateOrCreate(
            ['email' => $user->email],
            [
                'archived_name' => $user->name,
                'archived_username' => $user->username,
                'archived_password' => $user->password,
                'archived_profile_image' => $user->profile_image,
                'archived_email_verified_at' => $user->email_verified_at,
                'reason' => $reason,
                'appeal_message' => null,
                'appeal_submitted_at' => null,
                'banned_by_user_id' => $admin->id,
            ],
        );

        $deletedRoomCount = (int) $user->rooms_count;
        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'A felhasználó bannolva lett, és a fiókja törölve lett.',
            'deleted_room_count' => $deletedRoomCount,
        ]);
    }

    public function unbanUser(Request $request, string $banId): JsonResponse
    {
        $admin = $this->getAdminUser($request);
        if (! $admin) {
            return $this->unauthorizedResponse();
        }

        $bannedEmail = BannedEmail::query()->find($banId);
        if (! $bannedEmail) {
            return response()->json([
                'message' => 'A feloldani kívánt tiltás nem található.',
            ], 404);
        }

        if (! $bannedEmail->archived_name || ! $bannedEmail->archived_password) {
            return response()->json([
                'message' => 'Ehhez a tiltáshoz nem tartozik visszaállítható felhasználói adat. Csak az újabb bannolások állíthatók vissza teljes fiókkal.',
            ], 422);
        }

        $existingUserWithEmail = User::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($bannedEmail->email)])
            ->exists();
        if ($existingUserWithEmail) {
            return response()->json([
                'message' => 'Nem lehet visszaállítani a fiókot, mert ez az email cím már foglalt.',
            ], 409);
        }

        if ($bannedEmail->archived_username) {
            $existingUserWithUsername = User::query()
                ->where('username', $bannedEmail->archived_username)
                ->exists();

            if ($existingUserWithUsername) {
                return response()->json([
                    'message' => 'Nem lehet visszaállítani a fiókot, mert a korábbi felhasználónév már foglalt.',
                ], 409);
            }
        }

        $restoredUser = User::query()->create([
            'name' => $bannedEmail->archived_name,
            'username' => $bannedEmail->archived_username,
            'email' => $bannedEmail->email,
            'password' => $bannedEmail->archived_password,
            'profile_image' => $bannedEmail->archived_profile_image,
            'is_admin' => false,
        ]);
        $restoredUser->email_verified_at = $bannedEmail->archived_email_verified_at;
        $restoredUser->save();

        $email = $bannedEmail->email;
        $bannedEmail->delete();

        return response()->json([
            'message' => 'A tiltás feloldva, a felhasználó pedig visszaállítva a users táblába az eredeti jelszóval.',
            'email' => $email,
            'user' => [
                'id' => $restoredUser->id,
                'name' => $restoredUser->name,
                'email' => $restoredUser->email,
                'username' => $restoredUser->username,
            ],
        ]);
    }
}
