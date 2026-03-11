<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInvitationRequest;
use App\Mail\InvitationMail;
use App\Models\Friendship;
use App\Models\Invitation;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Mail;

class InvitationController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function store(StoreInvitationRequest $request): JsonResponse
    {
        $user = $request->user();

        $invitation = Invitation::query()->create([
            'invited_by' => $user->id,
            'email' => $request->input('email'),
            'token' => Str::uuid()->toString(),
            'expires_at' => now()->addHours(72),
        ]);

        Mail::to($request->input('email'))->send(new InvitationMail($invitation, $user));

        $this->activityLog->log(
            $user->id,
            'invitation.sent',
            'user',
            'Invitation',
            $invitation->id,
            ['email' => $request->input('email')],
            false,
            null,
            $request,
        );

        return response()->json(['message' => 'Invitation sent.'], 201);
    }

    public function show(string $token): Response
    {
        $invitation = Invitation::query()
            ->with('inviter')
            ->where('token', $token)
            ->first();

        if (! $invitation) {
            return Inertia::render('invite/show', [
                'inviter_name' => null,
                'email' => null,
                'token' => $token,
                'expired' => true,
            ]);
        }

        return Inertia::render('invite/show', [
            'inviter_name' => $invitation->inviter->name,
            'email' => $invitation->email,
            'token' => $token,
            'expired' => $invitation->accepted_at !== null || $invitation->expires_at->isPast(),
        ]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $user = $request->user();

        $invitation = Invitation::query()
            ->pending()
            ->where('token', $token)
            ->firstOrFail();

        $alreadyFriends = Friendship::query()
            ->where(function ($query) use ($user, $invitation): void {
                $query->where('requester_id', $invitation->invited_by)->where('addressee_id', $user->id);
            })
            ->orWhere(function ($query) use ($user, $invitation): void {
                $query->where('requester_id', $user->id)->where('addressee_id', $invitation->invited_by);
            })
            ->exists();

        if (! $alreadyFriends) {
            Friendship::query()->create([
                'requester_id' => $invitation->invited_by,
                'addressee_id' => $user->id,
                'status' => 'accepted',
                'requested_at' => now(),
                'responded_at' => now(),
            ]);
        }

        $invitation->update(['accepted_at' => now()]);

        $this->activityLog->log(
            $user->id,
            'invitation.accepted',
            'user',
            'Invitation',
            $invitation->id,
            null,
            false,
            $invitation->invited_by,
            $request,
        );

        return response()->json(['message' => 'Invitation accepted.']);
    }
}
