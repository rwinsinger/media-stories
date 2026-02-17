export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    subscription_tier: 'free' | 'premium';
    subscription_status: 'active' | 'cancelled' | 'expired';
    subscription_id?: string;
    story_count: number;
    is_admin: boolean;
    is_suspended: boolean;
    suspended_reason?: string;
    last_login_at?: string;
    settings?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};

export type Story = {
    id: string;
    user_id: number;
    title: string;
    description?: string;
    is_published: boolean;
    is_featured: boolean;
    is_flagged: boolean;
    flagged_reason?: string;
    frame_count: number;
    view_count: number;
    settings?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    user?: User;
    frames?: Frame[];
};

export type Frame = {
    id: string;
    story_id: string;
    order_index: number;
    media_type: 'image' | 'video';
    media_url: string;
    thumbnail_url?: string;
    text_content?: string;
    audio_url?: string;
    duration: number;
    settings?: Record<string, unknown>;
    created_at: string;
};

export type Friendship = {
    id: string;
    requester_id: number;
    addressee_id: number;
    status: 'pending' | 'accepted' | 'declined' | 'blocked';
    requested_at: string;
    responded_at?: string;
    requester?: User;
    addressee?: User;
};

export type StoryShare = {
    id: string;
    story_id: string;
    shared_by_user_id: number;
    shared_with_user_id: number;
    permission_level: 'view' | 'comment';
    shared_at: string;
    expires_at?: string;
    view_count: number;
    last_viewed_at?: string;
    is_revoked: boolean;
    revoked_at?: string;
    message?: string;
    story?: Story;
    sharedBy?: User;
    sharedWith?: User;
};

export type Notification = {
    id: string;
    user_id: number;
    type: 'friend_request' | 'friend_accepted' | 'story_shared' | 'story_comment';
    title: string;
    message: string;
    link_url?: string;
    is_read: boolean;
    read_at?: string;
    resource_type?: string;
    resource_id?: string;
    sender_id?: number;
    created_at: string;
    sender?: User;
};

export type ShareLink = {
    id: string;
    story_id: string;
    token: string;
    expires_at: string;
    view_count: number;
    max_views?: number;
    created_at: string;
};

export type ActivityLog = {
    id: string;
    user_id?: number;
    action: string;
    action_category: string;
    resource_type?: string;
    resource_id?: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    is_admin_action: boolean;
    target_user_id?: number;
    created_at: string;
    user?: User;
};

export type FeatureFlag = {
    key: string;
    enabled: boolean;
    description?: string;
    rollout_percentage: number;
    updated_at: string;
};

export type SiteConfig = {
    key: string;
    value: unknown;
    updated_at: string;
    updated_by?: number;
};
