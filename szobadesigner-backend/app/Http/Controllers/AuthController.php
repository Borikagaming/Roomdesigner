<?php

namespace App\Http\Controllers;

use App\Models\BannedEmail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    private const ALLOWED_PASSWORD_SPECIAL_CHARACTERS = '!@#$%^&*._-';

    private function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    private function getPasswordValidationError(?string $password): ?string
    {
        $password = (string) $password;

        if (strlen($password) < 8) {
            return 'A jelszónak legalább 8 karakter hosszúnak kell lennie.';
        }

        if (! preg_match('/[A-Z]/', $password)) {
            return 'A jelszónak tartalmaznia kell legalább 1 nagybetűt.';
        }

        if (! preg_match('/\d/', $password)) {
            return 'A jelszónak tartalmaznia kell legalább 1 számot.';
        }

        if (! preg_match('/^[A-Za-z\d!@#$%^&*._-]+$/', $password)) {
            return 'A jelszó csak betűket, számokat és ezeket a speciális karaktereket tartalmazhatja: ' . self::ALLOWED_PASSWORD_SPECIAL_CHARACTERS;
        }

        return null;
    }

    private function findBannedEmail(string $email): ?BannedEmail
    {
        return BannedEmail::query()
            ->whereRaw('LOWER(email) = ?', [$this->normalizeEmail($email)])
            ->first();
    }

    private function bannedEmailResponse(BannedEmail $bannedEmail): JsonResponse
    {
        return response()->json([
            'message' => 'Ez az email cim ki van bannolva. Indok: ' . $bannedEmail->reason,
            'is_banned' => true,
            'ban' => [
                'id' => $bannedEmail->id,
                'email' => $bannedEmail->email,
                'reason' => $bannedEmail->reason,
                'appeal_message' => $bannedEmail->appeal_message,
                'appeal_submitted_at' => $bannedEmail->appeal_submitted_at,
            ],
        ], 403);
    }

    public function register(Request $request)
    {
        $acceptedGdpr = filter_var($request->input('accepted_gdpr'), FILTER_VALIDATE_BOOLEAN);
        $acceptedTerms = filter_var($request->input('accepted_terms'), FILTER_VALIDATE_BOOLEAN);
        $email = trim((string) $request->input('email', ''));

        $bannedEmail = $this->findBannedEmail($email);
        if ($bannedEmail) {
            return $this->bannedEmailResponse($bannedEmail);
        }

        if (! $acceptedGdpr || ! $acceptedTerms) {
            return response()->json([
                'message' => 'A regisztrációhoz el kell fogadni az adatkezelési tájékoztatót és az ÁSZF-et!',
            ], 400);
        }

        $passwordValidationError = $this->getPasswordValidationError($request->input('password'));
        if ($passwordValidationError) {
            return response()->json([
                'message' => $passwordValidationError,
            ], 400);
        }

        if (User::query()->whereRaw('LOWER(email) = ?', [$this->normalizeEmail($email)])->exists()) {
            return response()->json([
                'message' => 'Már létezik felhasználó ezzel az email címmel!',
            ], 409);
        }

        $user = User::create([
            'name' => $request->input('name'),
            'email' => $email,
            'password' => Hash::make((string) $request->input('password')),
        ]);

        return response()->json([
            'message' => 'Sikeres mentés!',
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $identifier = trim((string) $request->input('identifier', $request->input('email', '')));
        $password = (string) $request->input('password', '');

        $bannedEmail = $this->findBannedEmail($identifier);
        if ($bannedEmail) {
            return $this->bannedEmailResponse($bannedEmail);
        }

        $user = User::query()
            ->where('email', $identifier)
            ->orWhere('username', $identifier)
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Helytelen e-mail/felhasználónév vagy jelszó!'], 401);
        }

        if (! Hash::check($password, $user->password)) {
            return response()->json(['message' => 'A jelszó helytelen!'], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'token' => $token,
            'user' => $user,
        ], 200);
    }

    public function submitBanAppeal(Request $request): JsonResponse
    {
        $email = trim((string) $request->input('email', ''));
        $appealMessage = trim((string) $request->input('message', ''));

        if ($email === '') {
            return response()->json([
                'message' => 'A fellebbezéshez meg kell adni az email címet.',
            ], 422);
        }

        if ($appealMessage === '') {
            return response()->json([
                'message' => 'A fellebbezéshez indokló üzenetet kell megadni.',
            ], 422);
        }

        $bannedEmail = $this->findBannedEmail($email);
        if (! $bannedEmail) {
            return response()->json([
                'message' => 'Ehhez az email címhez jelenleg nem tartozik aktív tiltás.',
            ], 404);
        }

        $bannedEmail->appeal_message = $appealMessage;
        $bannedEmail->appeal_submitted_at = now();
        $bannedEmail->save();

        return response()->json([
            'message' => 'A fellebbezés sikeresen elküldve. Az admin felületen meg fog jelenni.',
            'ban' => [
                'id' => $bannedEmail->id,
                'email' => $bannedEmail->email,
                'reason' => $bannedEmail->reason,
                'appeal_message' => $bannedEmail->appeal_message,
                'appeal_submitted_at' => $bannedEmail->appeal_submitted_at,
            ],
        ], 200);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Nem található felhasználó!'], 401);
        }

        if ($request->has('name')) {
            $user->name = $request->input('name');
        }

        if ($request->has('email')) {
            $nextEmail = trim((string) $request->input('email'));
            $emailTaken = User::query()
                ->whereRaw('LOWER(email) = ?', [mb_strtolower($nextEmail)])
                ->whereKeyNot($user->id)
                ->exists();

            if ($emailTaken) {
                return response()->json(['message' => 'Ez az email cím már foglalt!'], 409);
            }

            $user->email = $nextEmail;
        }

        $isPasswordChangeRequested =
            $request->filled('current_password') ||
            $request->filled('new_password') ||
            $request->filled('new_password_confirm');

        if ($isPasswordChangeRequested) {
            if (! $request->filled('current_password')) {
                return response()->json(['message' => 'A jelszó módosításához meg kell adni a jelenlegi jelszót.'], 400);
            }

            if (! $request->filled('new_password') || ! $request->filled('new_password_confirm')) {
                return response()->json(['message' => 'Az új jelszót kétszer kell megadni.'], 400);
            }

            $passwordValidationError = $this->getPasswordValidationError($request->input('new_password'));
            if ($passwordValidationError) {
                return response()->json(['message' => $passwordValidationError], 400);
            }

            if (! Hash::check((string) $request->input('current_password'), $user->password)) {
                return response()->json(['message' => 'A jelenlegi jelszó helytelen!'], 400);
            }

            if ($request->input('new_password') !== $request->input('new_password_confirm')) {
                return response()->json(['message' => 'Az új jelszavak nem egyeznek!'], 400);
            }

            $user->password = (string) $request->input('new_password');
        }

        if ($request->exists('profile_image')) {
            $profileImage = $request->input('profile_image');
            $user->profile_image = ($profileImage === '' || $profileImage === null)
                ? null
                : $profileImage;
        }

        $user->save();

        return response()->json([
            'message' => 'Profil sikeresen frissítve!',
            'user' => $user,
        ], 200);
    }

    public function deleteProfile(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Nem található felhasználó!'], 404);
        }

        $user->delete();

        return response()->json(['message' => 'Profil sikeresen törölve!'], 200);
    }
}
