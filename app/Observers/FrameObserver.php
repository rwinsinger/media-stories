<?php

namespace App\Observers;

use App\Models\Frame;

class FrameObserver
{
    public function created(Frame $frame): void
    {
        $frame->story()->increment('frame_count');
    }

    public function deleted(Frame $frame): void
    {
        $frame->story()->decrement('frame_count');
    }
}
