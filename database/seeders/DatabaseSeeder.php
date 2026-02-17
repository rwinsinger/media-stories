<?php

namespace Database\Seeders;

use App\Models\FeatureFlag;
use App\Models\Frame;
use App\Models\Friendship;
use App\Models\Notification;
use App\Models\SiteConfig;
use App\Models\Story;
use App\Models\StoryShare;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $alice = User::factory()->create([
            'name' => 'Alice',
            'email' => 'alice@test.com',
            'password' => bcrypt('password'),
            'is_admin' => true,
            'subscription_tier' => 'premium',
            'subscription_status' => 'active',
            'story_count' => 2,
        ]);

        $bob = User::factory()->create([
            'name' => 'Bob',
            'email' => 'bob@test.com',
            'password' => bcrypt('password'),
            'is_admin' => false,
            'subscription_tier' => 'free',
            'subscription_status' => 'active',
            'story_count' => 2,
        ]);

        Friendship::factory()->accepted()->create([
            'requester_id' => $alice->id,
            'addressee_id' => $bob->id,
        ]);

        $aliceStory1 = Story::factory()->published()->create([
            'user_id' => $alice->id,
            'title' => "Alice's Story 1",
            'frame_count' => 2,
        ]);

        $aliceStory2 = Story::factory()->create([
            'user_id' => $alice->id,
            'title' => "Alice's Story 2",
            'frame_count' => 2,
        ]);

        $bobStory1 = Story::factory()->published()->create([
            'user_id' => $bob->id,
            'title' => "Bob's Story 1",
            'frame_count' => 2,
        ]);

        $bobStory2 = Story::factory()->create([
            'user_id' => $bob->id,
            'title' => "Bob's Story 2",
            'frame_count' => 2,
        ]);

        $this->createFrames($aliceStory1, $aliceStory2, $bobStory1, $bobStory2);

        $storyShare = StoryShare::factory()->create([
            'story_id' => $aliceStory1->id,
            'shared_by_user_id' => $alice->id,
            'shared_with_user_id' => $bob->id,
            'permission_level' => 'view',
        ]);

        Notification::factory()->storyShared()->create([
            'user_id' => $bob->id,
            'sender_id' => $alice->id,
            'title' => 'Alice shared a story with you',
            'message' => 'Alice has shared "Alice\'s Story 1" with you.',
            'resource_type' => 'StoryShare',
            'resource_id' => $storyShare->id,
        ]);

        $this->seedConfig();
        $this->seedFeatureFlags();
    }

    private function createFrames(Story ...$stories): void
    {
        foreach ($stories as $story) {
            Frame::factory()->image()->create([
                'story_id' => $story->id,
                'order_index' => 0,
                'media_url' => 'https://picsum.photos/seed/'.$story->id.'/800/600',
                'duration' => 5000,
            ]);

            Frame::factory()->image()->create([
                'story_id' => $story->id,
                'order_index' => 1,
                'media_url' => 'https://picsum.photos/seed/'.$story->id.'b/800/600',
                'duration' => 5000,
            ]);
        }
    }

    private function seedConfig(): void
    {
        $configs = [
            'max_free_stories' => 5,
            'max_premium_stories' => null,
            'max_frames_per_story' => 100,
            'max_free_friends' => 10,
            'max_premium_friends' => 500,
            'max_free_shares_per_story' => 3,
            'max_premium_shares_per_story' => 50,
            'share_link_duration_hours' => 72,
            'max_image_size_mb' => 10,
            'max_video_size_mb' => 100,
            'friend_request_rate_limit_per_hour' => ['free' => 10, 'premium' => 50],
            'default_frame_duration_ms' => 5000,
        ];

        foreach ($configs as $key => $value) {
            SiteConfig::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }

    private function seedFeatureFlags(): void
    {
        $flags = [
            ['key' => 'video_editing', 'enabled' => true, 'rollout_percentage' => 100, 'description' => 'Video editing support'],
            ['key' => 'social_login', 'enabled' => false, 'rollout_percentage' => 0, 'description' => 'OAuth social login'],
            ['key' => 'story_discovery', 'enabled' => true, 'rollout_percentage' => 100, 'description' => 'Public story discovery'],
            ['key' => 'ai_captions', 'enabled' => false, 'rollout_percentage' => 0, 'description' => 'AI-generated captions'],
        ];

        foreach ($flags as $flag) {
            FeatureFlag::query()->updateOrCreate(['key' => $flag['key']], $flag);
        }
    }
}
