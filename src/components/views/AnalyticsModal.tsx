import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  HelpCircle, 
  Film, 
  Calendar, 
  TrendingUp, 
  Eye, 
  Clock, 
  Percent, 
  ThumbsUp, 
  MessageSquare, 
  UserPlus, 
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { VideoAnalytics, VideoProject } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { formatSecondsToTime, parseTimeToSeconds } from '../../lib/analyticsEngine';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (analytics: VideoAnalytics) => void;
  initialData?: VideoAnalytics | null;
  projects?: VideoProject[];
  preselectedProjectId?: string | null;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  projects = [],
  preselectedProjectId,
}) => {
  if (!isOpen) return null;

  // Form State
  const [sourceType, setSourceType] = useState<'project' | 'external'>('project');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('Long-form');
  const [publishedDate, setPublishedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [views, setViews] = useState('');
  const [impressions, setImpressions] = useState('');
  const [ctr, setCtr] = useState('');
  const [watchTimeMinutes, setWatchTimeMinutes] = useState('');
  const [avdInput, setAvdInput] = useState(''); // can be mm:ss or seconds
  const [apvInput, setApvInput] = useState('');
  const [likes, setLikes] = useState('');
  const [comments, setComments] = useState('');
  const [subscribersGained, setSubscribersGained] = useState('');
  const [trafficSource, setTrafficSource] = useState('YouTube Search');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize data on open
  useEffect(() => {
    if (initialData) {
      setSourceType(initialData.videoProjectId ? 'project' : 'external');
      setSelectedProjectId(initialData.videoProjectId || '');
      setVideoTitle(initialData.videoTitle || '');
      setTopic(initialData.topic || '');
      setFormat(initialData.format || 'Long-form');
      setPublishedDate(initialData.publishedDate || new Date().toISOString().split('T')[0]);
      setViews(initialData.views !== undefined ? String(initialData.views) : '');
      setImpressions(initialData.impressions !== undefined ? String(initialData.impressions) : '');
      setCtr(initialData.ctr !== undefined ? String(initialData.ctr) : '');
      setWatchTimeMinutes(initialData.watchTimeMinutes !== undefined ? String(initialData.watchTimeMinutes) : '');
      setAvdInput(initialData.averageViewDurationSeconds !== undefined ? formatSecondsToTime(initialData.averageViewDurationSeconds) : '');
      setApvInput(initialData.averagePercentageViewed !== undefined ? String(initialData.averagePercentageViewed) : '');
      setLikes(initialData.likes !== undefined ? String(initialData.likes) : '');
      setComments(initialData.comments !== undefined ? String(initialData.comments) : '');
      setSubscribersGained(initialData.subscribersGained !== undefined ? String(initialData.subscribersGained) : '');
      setTrafficSource(initialData.trafficSource || 'YouTube Search');
      setNotes(initialData.notes || '');
    } else if (preselectedProjectId) {
      const proj = projects.find(p => p.id === preselectedProjectId);
      if (proj) {
        setSourceType('project');
        setSelectedProjectId(proj.id);
        setVideoTitle(proj.selectedTitle || proj.topic);
        setTopic(proj.topic);
        setFormat(proj.format || 'Long-form');
        setPublishedDate(new Date().toISOString().split('T')[0]);
      }
    } else if (projects.length > 0) {
      setSourceType('project');
      const firstProj = projects[0];
      setSelectedProjectId(firstProj.id);
      setVideoTitle(firstProj.selectedTitle || firstProj.topic);
      setTopic(firstProj.topic);
      setFormat(firstProj.format || 'Long-form');
    } else {
      setSourceType('external');
    }
  }, [initialData, preselectedProjectId, projects]);

  // When project dropdown changes
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setVideoTitle(proj.selectedTitle || proj.topic);
      setTopic(proj.topic);
      setFormat(proj.format || 'Long-form');
    }
  };

  // Auto calculate CTR if views & impressions entered and CTR is empty
  const handleCalculateCtr = () => {
    const v = parseFloat(views);
    const imp = parseFloat(impressions);
    if (!isNaN(v) && !isNaN(imp) && imp > 0) {
      const calculated = ((v / imp) * 100).toFixed(1);
      setCtr(calculated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!videoTitle.trim()) {
      newErrors.videoTitle = 'Video title is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const avdSecs = parseTimeToSeconds(avdInput);

    const payload: VideoAnalytics = {
      id: initialData?.id || `va-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      videoProjectId: sourceType === 'project' && selectedProjectId ? selectedProjectId : undefined,
      videoTitle: videoTitle.trim(),
      publishedDate: publishedDate || new Date().toISOString().split('T')[0],
      format: format || 'Long-form',
      topic: topic.trim() || videoTitle.trim(),
      views: views !== '' && !isNaN(Number(views)) && Number(views) >= 0 ? Math.round(Number(views)) : undefined,
      impressions: impressions !== '' && !isNaN(Number(impressions)) && Number(impressions) >= 0 ? Math.round(Number(impressions)) : undefined,
      ctr: ctr !== '' && !isNaN(Number(ctr)) ? Number(parseFloat(ctr).toFixed(1)) : undefined,
      watchTimeMinutes: watchTimeMinutes !== '' && !isNaN(Number(watchTimeMinutes)) && Number(watchTimeMinutes) >= 0 ? Number(parseFloat(watchTimeMinutes).toFixed(1)) : undefined,
      averageViewDurationSeconds: avdSecs,
      averagePercentageViewed: apvInput !== '' && !isNaN(Number(apvInput)) ? Number(parseFloat(apvInput).toFixed(1)) : undefined,
      likes: likes !== '' && !isNaN(Number(likes)) && Number(likes) >= 0 ? Math.round(Number(likes)) : undefined,
      comments: comments !== '' && !isNaN(Number(comments)) && Number(comments) >= 0 ? Math.round(Number(comments)) : undefined,
      subscribersGained: subscribersGained !== '' && !isNaN(Number(subscribersGained)) ? Math.round(Number(subscribersGained)) : undefined,
      trafficSource: trafficSource || 'YouTube Search',
      notes: notes.trim(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200/90 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
                Manual Analytics
              </span>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                {initialData ? 'Edit Video Results' : 'Add Video Results'}
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Enter your metrics from YouTube Studio. All numeric fields are optional.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Source Selector: CreatorFlow Project vs External Video */}
          <div className="space-y-2">
            <label className="font-bold text-neutral-800 text-xs block">Video Origin</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSourceType('project')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  sourceType === 'project'
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs font-semibold'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <Film className={`w-4 h-4 shrink-0 mt-0.5 ${sourceType === 'project' ? 'text-white' : 'text-neutral-500'}`} />
                <div>
                  <div className="font-semibold text-xs">CreatorFlow Project</div>
                  <div className={`text-[11px] ${sourceType === 'project' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    Pre-fill from an existing project
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceType('external');
                  setSelectedProjectId('');
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  sourceType === 'external'
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs font-semibold'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <LinkIcon className={`w-4 h-4 shrink-0 mt-0.5 ${sourceType === 'external' ? 'text-white' : 'text-neutral-500'}`} />
                <div>
                  <div className="font-semibold text-xs">External Video</div>
                  <div className={`text-[11px] ${sourceType === 'external' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    Track a video created outside CreatorFlow
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Project Dropdown if project origin */}
          {sourceType === 'project' && (
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-2">
              <label className="font-bold text-neutral-700 text-xs block">Select CreatorFlow Project</label>
              {projects.length > 0 ? (
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="w-full text-xs rounded-lg border border-neutral-300 px-3 py-2 bg-white text-neutral-800 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="">-- Choose a project --</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.selectedTitle || proj.topic} ({proj.format})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] text-neutral-500">
                  No projects saved yet. You can still enter the video details below or switch to "External Video".
                </p>
              )}
            </div>
          )}

          {/* Video Metadata */}
          <div className="space-y-3">
            <div>
              <label className="font-bold text-neutral-800 text-xs block mb-1">
                Video Title <span className="text-rose-500">*</span>
              </label>
              <Input
                value={videoTitle}
                onChange={(e) => {
                  setVideoTitle(e.target.value);
                  if (errors.videoTitle) setErrors(prev => ({ ...prev, videoTitle: '' }));
                }}
                placeholder="E.g., 7 Editing Mistakes Killing Your YouTube Retention"
                className="text-xs"
              />
              {errors.videoTitle && (
                <p className="text-rose-600 text-[11px] mt-1">{errors.videoTitle}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-neutral-700 text-xs block mb-1">Topic / Niche</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="E.g., Video Editing"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 text-xs block mb-1">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full text-xs rounded-lg border border-neutral-300 px-3 py-2 bg-white text-neutral-800 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="Long-form">Long-form (16:9)</option>
                  <option value="Short">YouTube Short (9:16)</option>
                  <option value="Tutorial">Tutorial / How-To</option>
                  <option value="Educational">Educational Breakdown</option>
                  <option value="Vlog / Story">Vlog / Story</option>
                  <option value="Review">Product Review</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-neutral-700 text-xs block mb-1">Published Date</label>
                <Input
                  type="date"
                  value={publishedDate}
                  onChange={(e) => setPublishedDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* YouTube Studio Metrics Section */}
          <div className="space-y-3 pt-3 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-900 text-xs">YouTube Studio Performance Numbers</h3>
                <p className="text-[11px] text-neutral-500">Copy numbers directly from YouTube Studio Analytics tab.</p>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                All Optional
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-neutral-700 font-semibold text-[11px] block mb-1">Views</label>
                <Input
                  type="number"
                  min="0"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                  placeholder="E.g., 2450"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-700 font-semibold text-[11px] block mb-1">Impressions</label>
                <Input
                  type="number"
                  min="0"
                  value={impressions}
                  onChange={(e) => setImpressions(e.target.value)}
                  placeholder="E.g., 38000"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-neutral-700 font-semibold text-[11px]">CTR (%)</label>
                  {views && impressions && (
                    <button
                      type="button"
                      onClick={handleCalculateCtr}
                      className="text-[10px] text-rose-600 hover:underline font-medium"
                    >
                      Calc CTR
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={ctr}
                  onChange={(e) => setCtr(e.target.value)}
                  placeholder="E.g., 6.4"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-700 font-semibold text-[11px] block mb-1">Watch Time (Minutes)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={watchTimeMinutes}
                  onChange={(e) => setWatchTimeMinutes(e.target.value)}
                  placeholder="E.g., 5400"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-700 font-semibold text-[11px] block mb-1">Avg View Duration (AVD)</label>
                <Input
                  value={avdInput}
                  onChange={(e) => setAvdInput(e.target.value)}
                  placeholder="E.g., 3:15 or 195s"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-700 font-semibold text-[11px] block mb-1">Avg % Viewed</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={apvInput}
                  onChange={(e) => setApvInput(e.target.value)}
                  placeholder="E.g., 52"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-700 font-semibold text-[11px] block mb-1">Likes</label>
                <Input
                  type="number"
                  min="0"
                  value={likes}
                  onChange={(e) => setLikes(e.target.value)}
                  placeholder="E.g., 180"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-700 font-semibold text-[11px] block mb-1">Comments</label>
                <Input
                  type="number"
                  min="0"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="E.g., 32"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-700 font-semibold text-[11px] block mb-1">Subscribers Gained</label>
                <Input
                  type="number"
                  value={subscribersGained}
                  onChange={(e) => setSubscribersGained(e.target.value)}
                  placeholder="E.g., 45"
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Traffic Source & Creator Reflections */}
          <div className="space-y-3 pt-3 border-t border-neutral-200">
            <div>
              <label className="font-bold text-neutral-800 text-xs block mb-1">Primary Traffic Source</label>
              <select
                value={trafficSource}
                onChange={(e) => setTrafficSource(e.target.value)}
                className="w-full text-xs rounded-lg border border-neutral-300 px-3 py-2 bg-white text-neutral-800 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="YouTube Search">YouTube Search (High Intent / Tutorials)</option>
                <option value="Browse features">Browse Features (Home screen & Subscriptions)</option>
                <option value="Suggested videos">Suggested Videos (Related recommendations)</option>
                <option value="Shorts feed">Shorts Feed (Swipes / Mobile vertical)</option>
                <option value="External">External (Google, Reddit, Twitter, etc.)</option>
                <option value="Channel pages">Channel Pages</option>
                <option value="Other YouTube features">Other YouTube Features</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-neutral-800 text-xs block mb-1">
                Creator Reflections & Notes
              </label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What worked? What was the retention dip reason? Did viewers mention any specific chapter?"
                className="text-xs"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {initialData ? 'Update Results' : 'Save Results'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
