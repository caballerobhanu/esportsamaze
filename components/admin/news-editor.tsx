'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { CharacterCount } from '@tiptap/extension-character-count';
import Youtube from '@tiptap/extension-youtube';
import {
  ArrowLeft,
  Bold,
  Braces,
  CheckCircle2,
  ChevronDown,
  Code2,
  Eye,
  Heading2,
  Heading3,
  History,
  ImagePlus,
  Italic,
  Library,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  RotateCcw,
  Save,
  Strikethrough,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { ARTICLE_CATEGORIES, isHtmlContent, legacyMarkdownToHtml } from '@/lib/news';
import { slugify } from '@/lib/utils';
import { saveArticle, deleteArticle, restoreRevisionById } from '@/app/admin/(panel)/news/actions';
import { Combobox } from '@/components/admin/combobox';
import { MediaPickerDialog } from '@/components/admin/media-picker-dialog';

export interface NewsEditorRevision {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  createdAt: string;
}

export interface NewsEditorArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  ogImage: string | null;
  category: string;
  tags: string[];
  authorName: string;
  authorRole: string | null;
  status: string;
  featured: boolean;
  publishedAt: string;
  tournamentId: string | null;
  teamId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  views: number;
}

interface NewsEditorProps {
  article: NewsEditorArticle | null;
  tournamentOptions: Array<{ value: string; label: string }>;
  teamOptions: Array<{ value: string; label: string }>;
  revisions?: NewsEditorRevision[];
  error?: string;
  saved?: boolean;
  restored?: boolean;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LengthMeter({ value, ideal, max }: { value: number; ideal: number; max: number }) {
  const color = value === 0 ? 'bg-slate-300 dark:bg-slate-600' : value > max ? 'bg-rose-500' : value > ideal ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${value > max ? 'text-rose-500' : 'text-slate-400'}`}>{value}</span>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-(--ed-blue) text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

export function NewsEditor({ article, tournamentOptions, teamOptions, revisions, error, saved, restored }: NewsEditorProps) {
  const isEdit = Boolean(article);
  const draftKey = `ea-news-draft-${article?.id ?? 'new'}`;

  const [title, setTitle] = useState(article?.title ?? '');
  const [status, setStatus] = useState(article?.status ?? 'PUBLISHED');
  const [publishedAtLocal, setPublishedAtLocal] = useState(
    toDatetimeLocal(article?.publishedAt ?? new Date().toISOString())
  );
  const [tags, setTags] = useState<string[]>(article?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [metaTitle, setMetaTitle] = useState(article?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(article?.metaDescription ?? '');
  const [focusKeyword, setFocusKeyword] = useState(article?.focusKeyword ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(article?.coverImage ?? '');
  const [coverUploading, setCoverUploading] = useState(false);
  const [draftBanner, setDraftBanner] = useState<{ title: string; html: string; at: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'editor' | 'cover'>('editor');
  const [expandedRevision, setExpandedRevision] = useState<string | null>(null);
  const [restoringRevision, setRestoringRevision] = useState<string | null>(null);

  const coverFileRef = useRef<HTMLInputElement>(null);

  /* ── Tiptap editor ── */
  // Legacy markdown articles are upgraded to plain HTML so the WYSIWYG shows
  // real headings/lists instead of literal `##` markers.
  const initialContent = article?.content
    ? isHtmlContent(article.content)
      ? article.content
      : legacyMarkdownToHtml(article.content)
    : '';

  const [contentHtml, setContentHtml] = useState(initialContent);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: 'Write the story… Use the toolbar above to format.' }),
      TiptapLink.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      TiptapImage.configure({ inline: false, allowBase64: false }),
      Youtube.configure({ nocookie: true, width: 800, height: 450 }),
      CharacterCount,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'news-editor-prose min-h-[440px] px-5 sm:px-8 py-5 focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      setContentHtml(ed.getHTML());
    },
  });

  /* ── Crash-recovery draft (localStorage) ── */
  const saveDraft = useCallback(
    (t: string, html: string) => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title: t, html, at: new Date().toISOString() }));
      } catch {
        /* storage unavailable — ignore */
      }
    },
    [draftKey]
  );

  // Debounced autosave of the working copy to localStorage.
  useEffect(() => {
    const timer = setTimeout(() => saveDraft(title, contentHtml), 1000);
    return () => clearTimeout(timer);
  }, [title, contentHtml, saveDraft]);

  // Offer a saved draft when it differs from what the server has. Runs once,
  // after the editor (and its initial HTML) is ready.
  useEffect(() => {
    if (!editor) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { title: string; html: string; at: string };
      if (draft?.html && draft.html !== editor.getHTML()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a persisted draft is a one-shot, post-mount restore offer
        setDraftBanner(draft);
      }
    } catch {
      /* ignore corrupt drafts */
    }
  }, [editor, draftKey]);

  const restoreDraft = () => {
    if (!draftBanner || !editor) return;
    editor.commands.setContent(draftBanner.html);
    setTitle(draftBanner.title);
    setContentHtml(draftBanner.html);
    setDraftBanner(null);
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setDraftBanner(null);
  };

  /* ── Uploads ── */
  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    if (!res.ok) return null;
    const json = (await res.json()) as { url?: string };
    return json.url ?? null;
  }, []);

  const handleCoverPicked = async (file: File | undefined) => {
    if (!file) return;
    setCoverUploading(true);
    const url = await uploadFile(file);
    setCoverUploading(false);
    if (url) setCoverImageUrl(url);
    if (coverFileRef.current) coverFileRef.current.value = '';
  };

  /* ── Media library picker ── */
  const openPicker = (target: 'editor' | 'cover') => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handleMediaPick = (url: string, altText: string) => {
    setPickerOpen(false);
    if (pickerTarget === 'cover') {
      setCoverImageUrl(url);
      return;
    }
    editor?.chain().focus().setImage({ src: url, alt: altText || undefined }).run();
  };

  /* ── Tag chip input ── */
  const commitTag = () => {
    const t = tagDraft.trim().replace(/,+$/, '');
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) setTags([...tags, t]);
    setTagDraft('');
  };

  /* ── Toolbar actions ── */
  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (leave empty to remove)', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const embedYoutube = () => {
    if (!editor) return;
    const url = window.prompt('YouTube video URL');
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  };

  const words = editor?.storage.characterCount.words() ?? 0;
  const readTime = Math.max(1, Math.round(words / 200));

  const effSlug = slugify(article?.slug || title) || 'your-article';
  const serpTitle = (metaTitle || title || 'Untitled article').slice(0, 70);
  const serpDesc = (metaDescription || excerpt || 'Add an excerpt or meta description so search engines show a compelling summary…').slice(0, 170);

  // Time-dependent by design: drafts/future-scheduled stories preview via the admin route.
  const isLiveArticle =
    isEdit &&
    (article!.status === 'PUBLISHED' ||
      // eslint-disable-next-line react-hooks/purity -- the preview target depends on the current clock
      (article!.status === 'SCHEDULED' && new Date(article!.publishedAt).getTime() <= Date.now()));

  return (
    <div className="min-h-[calc(100vh-2rem)]">
      <form
        action={saveArticle}
        onSubmit={() => {
          try {
            localStorage.removeItem(draftKey);
          } catch {
            /* ignore */
          }
        }}
        className="space-y-5"
      >
        {isEdit && <input type="hidden" name="id" value={article!.id} />}
        <input type="hidden" name="content" value={contentHtml} />
        <input type="hidden" name="tags" value={tags.join(', ')} />
        <input type="hidden" name="coverImageUrl" value={coverImageUrl} />

        {/* ══════════ STICKY HEADER ══════════ */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-[#0b1220]/95 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/news"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              title="Back to News Studio"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <input
              type="text"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article headline…"
              className="min-w-0 flex-1 border-none bg-transparent text-lg font-black tracking-tight text-slate-900 placeholder:text-slate-300 focus:outline-none dark:text-white dark:placeholder:text-slate-600 sm:text-xl"
            />

            <div className="flex items-center gap-2">
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-black uppercase tracking-wider focus:outline-none ${
                  status === 'PUBLISHED'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : status === 'SCHEDULED'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                }`}
              >
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="DRAFT">Draft</option>
              </select>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-opacity hover:opacity-90"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </div>

          {isEdit && (
            <div className="mt-1.5 flex items-center gap-3 text-[11px] font-semibold text-slate-400">
              <span className="truncate">/news/{article!.slug}</span>
              <span>•</span>
              <span>{article!.views} views</span>
              <Link
                href={
                  isLiveArticle
                    ? `/news/${article!.slug}`
                    : `/admin/news/${article!.id}/preview`
                }
                target="_blank"
                title="Open a full preview of this article"
                className="inline-flex items-center gap-1 text-(--ed-blue) hover:underline"
              >
                <Eye className="h-3 w-3" /> Preview
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            {error === 'required' ? 'Title and article body are required.' : 'Failed to save the article. Check your input and try again.'}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Article saved successfully.
          </div>
        )}
        {restored && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs font-bold text-blue-600 dark:text-blue-400">
            <History className="h-4 w-4" /> Revision restored into the editor. The previous state was saved as a new revision.
          </div>
        )}

        {draftBanner && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
              Found an unsaved local draft from {new Date(draftBanner.at).toLocaleTimeString()}.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={restoreDraft}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white"
              >
                <RotateCcw className="h-3 w-3" /> Restore draft
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-white/10"
              >
                <X className="h-3 w-3" /> Discard
              </button>
            </div>
          </div>
        )}

        {/* ══════════ MAIN GRID: editor + sidebar ══════════ */}
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* ────────── Editor column ────────── */}
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/80 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                <ToolbarButton
                  title="Bold"
                  active={editor?.isActive('bold')}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  disabled={!editor}
                >
                  <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Italic"
                  active={editor?.isActive('italic')}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  disabled={!editor}
                >
                  <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Strikethrough"
                  active={editor?.isActive('strike')}
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  disabled={!editor}
                >
                  <Strikethrough className="h-4 w-4" />
                </ToolbarButton>

                <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />

                <ToolbarButton
                  title="Heading 2"
                  active={editor?.isActive('heading', { level: 2 })}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  disabled={!editor}
                >
                  <Heading2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Heading 3"
                  active={editor?.isActive('heading', { level: 3 })}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  disabled={!editor}
                >
                  <Heading3 className="h-4 w-4" />
                </ToolbarButton>

                <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />

                <ToolbarButton
                  title="Bullet list"
                  active={editor?.isActive('bulletList')}
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  disabled={!editor}
                >
                  <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Numbered list"
                  active={editor?.isActive('orderedList')}
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  disabled={!editor}
                >
                  <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Quote"
                  active={editor?.isActive('blockquote')}
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  disabled={!editor}
                >
                  <Quote className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Code block"
                  active={editor?.isActive('codeBlock')}
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                  disabled={!editor}
                >
                  <Code2 className="h-4 w-4" />
                </ToolbarButton>

                <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />

                <ToolbarButton title="Insert link" active={editor?.isActive('link')} onClick={setLink} disabled={!editor}>
                  <Link2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Insert image (upload or pick from library)"
                  onClick={() => openPicker('editor')}
                  disabled={!editor}
                >
                  <ImagePlus className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Embed YouTube video" onClick={embedYoutube} disabled={!editor}>
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden>
                    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
                  </svg>
                </ToolbarButton>
                <ToolbarButton
                  title="Divider"
                  onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                  disabled={!editor}
                >
                  <Minus className="h-4 w-4" />
                </ToolbarButton>

                <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />

                <ToolbarButton title="Undo" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor}>
                  <Undo2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Redo" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor}>
                  <Redo2 className="h-4 w-4" />
                </ToolbarButton>

                <div className="ml-auto flex items-center gap-3 pr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Braces className="hidden h-3 w-3 sm:block" />
                  <span>{words} words</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">~{readTime} min read</span>
                </div>
              </div>

              <EditorContent editor={editor} />
            </div>

            {/* Excerpt lives in the main column: it feeds cards + SERP */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="mb-1 flex items-center justify-between">
                <label className={labelCls + ' mb-0'}>Excerpt / standfirst (cards & search snippets)</label>
                <LengthMeter value={excerpt.length} ideal={160} max={220} />
              </div>
              <textarea
                name="excerpt"
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="One or two sentences summarising the story — shown on news cards, search results and social previews."
                className={inputCls}
              />
            </div>
          </div>

          {/* ────────── Sidebar column ────────── */}
          <div className="space-y-5">
            {/* Publish settings */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <h3 className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Publish settings</h3>

              <label className={labelCls}>Publish date & time</label>
              <input
                type="datetime-local"
                name="publishedAt"
                value={publishedAtLocal}
                onChange={(e) => setPublishedAtLocal(e.target.value)}
                className={inputCls}
              />
              {status === 'SCHEDULED' && (
                <p className="mt-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Goes live automatically once this time passes.
                </p>
              )}

              <label className="mt-3 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={article?.featured ?? false}
                  className="h-4 w-4 rounded border-slate-300 text-(--ed-blue) focus:ring-(--ed-blue)"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Featured story (news hub banner)
                </span>
              </label>

              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-(--ed-blue) py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:opacity-90"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isEdit ? 'Save changes' : 'Create article'}
              </button>
            </div>

            {/* Cover image */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <h3 className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Cover image</h3>

              {coverImageUrl ? (
                <div className="relative mb-2 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Cover preview" className="h-32 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl('')}
                    title="Remove cover"
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  className="mb-2 flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-(--ed-blue) hover:text-(--ed-blue) dark:border-white/10"
                >
                  {coverUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {coverUploading ? 'Uploading…' : 'Upload image'}
                  </span>
                </button>
              )}

              <input
                ref={coverFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleCoverPicked(e.target.files?.[0])}
              />
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openPicker('cover')}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 hover:border-(--ed-blue) hover:text-(--ed-blue) dark:border-white/10 dark:text-slate-300"
                >
                  <Library className="h-3.5 w-3.5" /> Media library
                </button>
                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 hover:border-(--ed-blue) hover:text-(--ed-blue) dark:border-white/10 dark:text-slate-300"
                >
                  {coverUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Upload
                </button>
              </div>
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="…or paste an external image URL"
                className={`${inputCls} text-xs`}
              />
            </div>

            {/* Taxonomy */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <h3 className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Category & tags</h3>

              <label className={labelCls}>Category</label>
              <select name="category" defaultValue={article?.category ?? 'TOURNAMENTS'} className={inputCls}>
                {ARTICLE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <label className={`${labelCls} mt-3`}>Tags</label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      commitTag();
                    } else if (e.key === 'Backspace' && !tagDraft && tags.length > 0) {
                      setTags(tags.slice(0, -1));
                    }
                  }}
                  onBlur={commitTag}
                  placeholder={tags.length === 0 ? 'Type a tag, press Enter…' : 'Add another…'}
                  className="min-w-[120px] flex-1 border-none bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Author name</label>
                  <input type="text" name="authorName" defaultValue={article?.authorName ?? 'eSportsAmaze Staff'} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Author role</label>
                  <input type="text" name="authorRole" defaultValue={article?.authorRole ?? 'Editor'} placeholder="e.g. Senior Analyst" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Context links */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <h3 className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Context links</h3>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Linked tournament</label>
                  <Combobox name="tournamentId" options={tournamentOptions} defaultValue={article?.tournamentId ?? ''} placeholder="Select tournament…" />
                </div>
                <div>
                  <label className={labelCls}>Linked team</label>
                  <Combobox name="teamId" options={teamOptions} defaultValue={article?.teamId ?? ''} placeholder="Select squad…" />
                </div>
              </div>
            </div>

            {/* Revision history (edit mode only) */}
            {isEdit && revisions && revisions.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <History className="h-3.5 w-3.5" /> Revision history
                  <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                    {revisions.length}
                  </span>
                </h3>
                <p className="mb-2 text-[10px] font-semibold leading-snug text-slate-400">
                  Snapshot of the previous version, taken on every save. Restoring also snapshots the current state first.
                </p>
                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                  {revisions.map((rev) => (
                    <li key={rev.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">{rev.title}</div>
                          <div className="text-[10px] font-semibold text-slate-400">
                            {new Date(rev.createdAt).toLocaleString()} • {rev.wordCount} words
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setExpandedRevision(expandedRevision === rev.id ? null : rev.id)}
                            title="View this snapshot"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={restoringRevision !== null}
                            onClick={async () => {
                              if (!window.confirm('Restore this revision? The current state is saved as a new revision first.')) return;
                              setRestoringRevision(rev.id);
                              try {
                                await restoreRevisionById(article!.id, rev.id);
                              } finally {
                                setRestoringRevision(null);
                              }
                            }}
                            title="Restore this version"
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400"
                          >
                            {restoringRevision === rev.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      {expandedRevision === rev.id && (
                        <div className="news-editor-prose mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                          <div dangerouslySetInnerHTML={{ __html: rev.content }} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SEO panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <h3 className="mb-3 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
                SEO
                <span className="flex items-center text-[10px] font-bold normal-case text-slate-400">
                  advanced
                  <ChevronDown className="h-3 w-3" />
                </span>
              </h3>

              <label className={labelCls}>URL slug (blank = from headline)</label>
              <input type="text" name="slug" defaultValue={article?.slug ?? ''} placeholder={slugify(title) || 'auto-generated'} className={inputCls} />
              <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">/news/{effSlug}</p>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label className={labelCls + ' mb-1'}>Meta title</label>
                  <LengthMeter value={metaTitle.length} ideal={60} max={70} />
                </div>
                <input
                  type="text"
                  name="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title ? title.slice(0, 60) : 'Falls back to the headline'}
                  className={inputCls}
                />
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label className={labelCls + ' mb-1'}>Meta description</label>
                  <LengthMeter value={metaDescription.length} ideal={155} max={170} />
                </div>
                <textarea
                  name="metaDescription"
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Falls back to the excerpt"
                  className={inputCls}
                />
              </div>

              {/* SERP preview */}
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search preview</div>
                <div className="mt-1.5 truncate text-[11px] text-emerald-700 dark:text-emerald-400">
                  esportsamaze.com › news › {effSlug}
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-[#1a0dab] dark:text-blue-300">{serpTitle}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600 dark:text-slate-400">{serpDesc}</div>
              </div>

              <label className={`${labelCls} mt-3`}>Focus keyword (internal checklist)</label>
              <input
                type="text"
                name="focusKeyword"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="e.g. BGMS 2026 grand finals recap"
                className={inputCls}
              />

              <label className={`${labelCls} mt-3`}>Social card image override (OG)</label>
              <input
                type="text"
                name="ogImage"
                defaultValue={article?.ogImage ?? ''}
                placeholder="Falls back to the cover image"
                className={inputCls}
              />
            </div>

            {/* Danger zone (edit mode only — formAction overrides the save action) */}
            {isEdit && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-950/10">
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Danger zone</h3>
                <button
                  type="submit"
                  formAction={deleteArticle}
                  onSubmit={(e) => {
                    if (!window.confirm('Move this article to trash? It will disappear from the public site until restored.')) e.preventDefault();
                  }}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white py-2 text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-transparent dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Move to trash
                </button>
              </div>
            )}
          </div>
        </div>
      </form>

      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handleMediaPick}
        title={pickerTarget === 'cover' ? 'Choose cover image' : 'Insert image'}
      />
    </div>
  );
}
