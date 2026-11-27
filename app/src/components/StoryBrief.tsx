import { BookOpenText, ChevronDown } from 'lucide-react';
import type { LessonStory } from '../types';
import { RichText } from './RichText';

interface StoryBriefProps {
  story: LessonStory;
  lessonKey: string;
}

export function StoryBrief({ story, lessonKey }: StoryBriefProps) {
  return (
    <section className="story-brief-wrap" aria-label="この単元のストーリー">
      <details key={lessonKey} className="story-brief" open>
        <summary className="story-brief-summary">
          <span className="story-brief-heading">
            <span className="story-episode-pill">
              <BookOpenText size={13} aria-hidden="true" />
              {story.episodeLabel}
            </span>
            <span className="story-hook-title">{story.hookTitle}</span>
          </span>
          <span className="story-toggle-cue" aria-hidden="true">
            <span className="story-toggle-label-open">閉じる</span>
            <span className="story-toggle-label-closed">ストーリーを読む</span>
            <ChevronDown size={15} className="story-chevron" />
          </span>
        </summary>

        <dl className="story-grid">
          <div className="story-cell">
            <dt className="story-cell-label is-request">1. 依頼・状況</dt>
            <dd className="story-cell-text">
              <RichText text={story.request} />
            </dd>
          </div>
          <div className="story-cell">
            <dt className="story-cell-label is-goal">2. 作りたいもの</dt>
            <dd className="story-cell-text">
              <RichText text={story.goal} />
            </dd>
          </div>
          <div className="story-cell">
            <dt className="story-cell-label is-challenge">3. 直面した課題</dt>
            <dd className="story-cell-text">
              <RichText text={story.challenge} />
            </dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
