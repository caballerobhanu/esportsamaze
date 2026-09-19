'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  FileQuestion,
  Heading2,
  Heading3,
  HelpCircle,
  History,
  ImagePlus,
  Italic,
  Layout,
  Library,
  Link2,
  List,
  ListOrdered,
  ListTree,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  MessageSquare,
  PenTool,
  Plus,
  Quote,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Share2,
  Sparkles,
  Strikethrough,
  Table,
  Target,
  Trash2,
  Undo2,
  User,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  ARTICLE_CATEGORIES,
  ARTICLE_STATUSES,
  ArticleFaq,
  formatCategoryDisplay,
  getCategoryMeta,
  isHtmlContent,
  legacyMarkdownToHtml,
  parseCategoryHierarchy,
} from '@/lib/news';
import { slugify } from '@/lib/utils';
import { saveArticle, deleteArticle, duplicateArticle, restoreRevisionById } from '@/app/admin/(panel)/news/actions';
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
  subHeadline?: string | null;
  excerpt: string | null;
  keyTakeaways?: string[] | null;
  content: string;
  coverImage: string | null;
  coverImageAlt?: string | null;
  coverImageCaption?: string | null;
  coverImageCredit?: string | null;
  ogImage: string | null;
  category: string;
  categories?: string[] | null;
  tags: string[];
  authorName: string;
  authorRole: string | null;
  status: string;
  featured: boolean;
  allowComments?: boolean;
  faqs?: ArticleFaq[] | null;
  publishedAt: string;
  tournamentId: string | null;
  teamId: string | null;
  playerId?: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  secondaryKeywords?: string[] | null;
  views: number;
}

interface NewsEditorProps {
  article: NewsEditorArticle | null;
  tournamentOptions: Array<{ value: string; label: string }>;
  teamOptions: Array<{ value: string; label: string }>;
  playerOptions?: Array<{ value: string; label: string }>;
  /** Base URL of the admin entity search endpoint — pickers query it instead
      of relying on preloaded option lists. Options arrays still seed the
      currently-linked entities so their labels render. */
  linkedSearchUrl?: string;
  revisions?: NewsEditorRevision[];
  error?: string;
  saved?: boolean;
  restored?: boolean;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

const WORD_TARGET_PRESETS = [
  { label: 'Flash News', target: 300 },
  { label: 'Standard', target: 600 },
  { label: 'Feature Story', target: 1000 },
  { label: 'Deep Dive', target: 1500 },
];

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LengthMeter({ value, ideal, max }: { value: number; ideal: number; max: number }) {
  const color =
    value === 0
      ? 'bg-slate-300 dark:bg-slate-600'
      : value > max
        ? 'bg-rose-500'
        : value > ideal
          ? 'bg-amber-500'
          : 'bg-emerald-500';
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

export function NewsEditor({
  article,
  tournamentOptions,
  teamOptions,
  playerOptions = [],
  linkedSearchUrl,
  revisions,
  error,
  saved,
  restored,
}: NewsEditorProps) {
  const isEdit = Boolean(article);
  const draftKey = `ea-news-draft-${article?.id ?? 'new'}`;

  // Core content state
  const [title, setTitle] = useState(article?.title ?? '');
  const [subHeadline, setSubHeadline] = useState(article?.subHeadline ?? '');
  const [status, setStatus] = useState(article?.status ?? 'PUBLISHED');
  const [publishedAtLocal, setPublishedAtLocal] = useState(
    toDatetimeLocal(article?.publishedAt ?? new Date().toISOString())
  );
  const [authorName, setAuthorName] = useState(article?.authorName ?? 'eSportsAmaze Staff');
  const [authorRole, setAuthorRole] = useState(article?.authorRole ?? 'Editor');
  const [allowComments, setAllowComments] = useState(article?.allowComments ?? true);

  // Category & Taxonomy State (Feature 1: Custom & Multiple/Nested Categories)
  const initialCategory = article?.category ?? 'TOURNAMENTS';
  const initialCategories = Array.isArray(article?.categories) && article!.categories.length > 0
    ? article!.categories
    : [initialCategory];
  const [primaryCategory, setPrimaryCategory] = useState(initialCategory);
  const [categoriesList, setCategoriesList] = useState<string[]>(initialCategories);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Tags
  const [tags, setTags] = useState<string[]>(article?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');

  // Key takeaways
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>(
    Array.isArray(article?.keyTakeaways) && article?.keyTakeaways.length > 0 ? article.keyTakeaways : []
  );
  const [newTakeawayInput, setNewTakeawayInput] = useState('');

  // FAQs
  const [faqs, setFaqs] = useState<ArticleFaq[]>(
    Array.isArray(article?.faqs) && article?.faqs.length > 0 ? article.faqs : []
  );

  // Images & Media
  const [coverImageUrl, setCoverImageUrl] = useState(article?.coverImage ?? '');
  const [coverImageAlt, setCoverImageAlt] = useState(article?.coverImageAlt ?? '');
  const [coverImageCaption, setCoverImageCaption] = useState(article?.coverImageCaption ?? '');
  const [coverImageCredit, setCoverImageCredit] = useState(article?.coverImageCredit ?? '');
  const [ogImage, setOgImage] = useState(article?.ogImage ?? '');
  const [coverUploading, setCoverUploading] = useState(false);

  // SEO & Keywords
  const [metaTitle, setMetaTitle] = useState(article?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(article?.metaDescription ?? '');
  const [focusKeyword, setFocusKeyword] = useState(article?.focusKeyword ?? '');
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>(
    Array.isArray(article?.secondaryKeywords) ? article.secondaryKeywords : []
  );
  const [secKeywordDraft, setSecKeywordDraft] = useState('');

  // Feature 2: Raw HTML Source Code Toggle
  const [isSourceView, setIsSourceView] = useState(false);

  // Feature 3: 1:1 True-to-Life In-Place Page Editing View
  const [inPlacePageView, setInPlacePageView] = useState(false);

  // Feature 5: Editorial Word Target & Reading Calculator
  const [wordTarget, setWordTarget] = useState<number>(1000);

  // Feature 6: Multi-Platform Social Auto-Formatter
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [copiedSocialType, setCopiedSocialType] = useState<string | null>(null);

  // Feature 7: In-Body Image Caption Dialog
  const [bodyImageModalOpen, setBodyImageModalOpen] = useState(false);
  const [bodyImageUrl, setBodyImageUrl] = useState('');
  const [bodyImageAlt, setBodyImageAlt] = useState('');
  const [bodyImageCaption, setBodyImageCaption] = useState('');

  // Embeds & Revisions
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [embedTab, setEmbedTab] = useState<'shortcode' | 'social' | 'table'>('shortcode');
  const [embedTweetUrl, setEmbedTweetUrl] = useState('');
  const [embedInstaUrl, setEmbedInstaUrl] = useState('');
  const [embedInstaCaptioned, setEmbedInstaCaptioned] = useState(false);
  const [draftBanner, setDraftBanner] = useState<{ title: string; html: string; at: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'editor' | 'cover' | 'og-image' | 'body-dialog'>('editor');
  const [expandedRevision, setExpandedRevision] = useState<string | null>(null);
  const [restoringRevision, setRestoringRevision] = useState<string | null>(null);

  const coverFileRef = useRef<HTMLInputElement>(null);

  /* ── Tiptap editor ── */
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
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Placeholder.configure({ placeholder: 'Write the story… Use the toolbar above or Embed button for rich widgets.' }),
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

  /* ── Sync content when toggling between Raw HTML Source and WYSIWYG ── */
  const toggleSourceView = () => {
    if (isSourceView) {
      // Switching from Raw HTML to WYSIWYG
      editor?.commands.setContent(contentHtml);
      setIsSourceView(false);
    } else {
      // Switching from WYSIWYG to Raw HTML
      if (editor) setContentHtml(editor.getHTML());
      setIsSourceView(true);
    }
  };

  /* ── Escape key closes full page editing mode ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inPlacePageView) {
        setInPlacePageView(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inPlacePageView]);

  /* ── Crash-recovery draft (localStorage) ── */
  const saveDraft = useCallback(
    (t: string, html: string) => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title: t, html, at: new Date().toISOString() }));
      } catch {
        /* storage unavailable */
      }
    },
    [draftKey]
  );

  useEffect(() => {
    const timer = setTimeout(() => saveDraft(title, contentHtml), 1000);
    return () => clearTimeout(timer);
  }, [title, contentHtml, saveDraft]);

  useEffect(() => {
    if (!editor) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { title: string; html: string; at: string };
      if (draft?.html && draft.html !== editor.getHTML()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraftBanner(draft);
      }
    } catch {
      /* ignore */
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
    fd.append('prefix', 'news');
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
  const openPicker = (target: 'editor' | 'cover' | 'og-image' | 'body-dialog') => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handleMediaPick = (url: string, altText: string) => {
    setPickerOpen(false);
    if (pickerTarget === 'cover') {
      setCoverImageUrl(url);
      if (altText && !coverImageAlt) setCoverImageAlt(altText);
      return;
    }
    if (pickerTarget === 'og-image') {
      setOgImage(url);
      return;
    }
    if (pickerTarget === 'body-dialog') {
      setBodyImageUrl(url);
      if (altText && !bodyImageAlt) setBodyImageAlt(altText);
      return;
    }
    // Default: open the Body Image Caption dialog pre-filled with this image!
    setBodyImageUrl(url);
    setBodyImageAlt(altText || '');
    setBodyImageCaption('');
    setBodyImageModalOpen(true);
  };

  /* ── Feature 7: Insert In-Body Image with Caption ── */
  const insertBodyImageWithCaption = () => {
    if (!bodyImageUrl.trim() || !editor) return;
    const cleanAlt = bodyImageAlt.trim() || title;
    const cleanCaption = bodyImageCaption.trim();

    const figureHtml = cleanCaption
      ? `<figure class="my-6 block"><img src="${bodyImageUrl.trim()}" alt="${cleanAlt}" class="rounded-xl w-full object-cover max-h-[520px]" /><figcaption class="mt-2 text-center text-xs italic text-slate-500 dark:text-slate-400">${cleanCaption}</figcaption></figure><p></p>`
      : `<figure class="my-6 block"><img src="${bodyImageUrl.trim()}" alt="${cleanAlt}" class="rounded-xl w-full object-cover max-h-[520px]" /></figure><p></p>`;

    editor.chain().focus().insertContent(figureHtml).run();
    setBodyImageModalOpen(false);
    setBodyImageUrl('');
    setBodyImageAlt('');
    setBodyImageCaption('');
  };

  /* ── Feature 1: Custom / Nested Categories logic ── */
  const addCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!categoriesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...categoriesList, trimmed];
      setCategoriesList(updated);
      if (!primaryCategory) setPrimaryCategory(trimmed);
    }
    setNewCategoryInput('');
  };

  const removeCategory = (catToRemove: string) => {
    const updated = categoriesList.filter((c) => c !== catToRemove);
    setCategoriesList(updated);
    if (primaryCategory === catToRemove) {
      setPrimaryCategory(updated[0] || 'GENERAL');
    }
  };

  /* ── Tag chip inputs ── */
  const commitTag = () => {
    const t = tagDraft.trim().replace(/,+$/, '');
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) setTags([...tags, t]);
    setTagDraft('');
  };

  const commitSecKeyword = () => {
    const k = secKeywordDraft.trim().replace(/,+$/, '');
    if (k && !secondaryKeywords.some((x) => x.toLowerCase() === k.toLowerCase())) {
      setSecondaryKeywords([...secondaryKeywords, k]);
    }
    setSecKeywordDraft('');
  };

  /* ── Key Takeaways helpers ── */
  const addTakeaway = () => {
    const trimmed = newTakeawayInput.trim();
    if (!trimmed) return;
    setKeyTakeaways([...keyTakeaways, trimmed]);
    setNewTakeawayInput('');
  };

  const removeTakeaway = (index: number) => {
    setKeyTakeaways(keyTakeaways.filter((_, i) => i !== index));
  };

  /* ── FAQ helpers ── */
  const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const copy = [...faqs];
    copy[index] = { ...copy[index], [field]: value };
    setFaqs(copy);
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const moveFaq = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === faqs.length - 1)) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...faqs];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setFaqs(copy);
  };

  /* ── Feature 4: Table of Contents Auto-Extractor ── */
  const headings = useMemo(() => {
    const items: Array<{ id: string; text: string; level: number }> = [];
    const regex = /<(h2|h3)[^>]*>(.*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    let count = 0;
    while ((match = regex.exec(contentHtml)) !== null) {
      count++;
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text) {
        items.push({
          id: `heading-${count}`,
          text,
          level: match[1].toLowerCase() === 'h2' ? 2 : 3,
        });
      }
    }
    return items;
  }, [contentHtml]);

  /* ── Feature 5: Words & Reading Progress ── */
  const words = editor?.storage.characterCount.words() ?? 0;
  const readTime = Math.max(1, Math.round(words / 200));
  const wordProgressPct = Math.min(100, Math.round((words / wordTarget) * 100));

  /* ── Toolbar & Embed actions ── */
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

  const insertShortcode = (code: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`<p><code>${code}</code></p>`).run();
    setEmbedModalOpen(false);
  };

  const insertTableTemplate = () => {
    if (!editor) return;
    const tableHtml = `
<table class="w-full border-collapse my-6 text-sm">
  <thead>
    <tr class="bg-slate-100 dark:bg-slate-800 text-left">
      <th class="border border-slate-300 dark:border-slate-700 p-2.5 font-bold">Team / Player</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2.5 font-bold text-center">Matches</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2.5 font-bold text-center">WWCD</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2.5 font-bold text-center">Elims</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2.5 font-bold text-center">Total Pts</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-slate-200 dark:border-slate-800 p-2.5 font-semibold">Team Soul</td>
      <td class="border border-slate-200 dark:border-slate-800 p-2.5 text-center">12</td>
      <td class="border border-slate-200 dark:border-slate-800 p-2.5 text-center">3</td>
      <td class="border border-slate-200 dark:border-slate-800 p-2.5 text-center">58</td>
      <td class="border border-slate-200 dark:border-slate-800 p-2.5 text-center font-black text-(--ed-blue)">114</td>
    </tr>
    <tr>
      <td class="border border-slate-200 dark:border-slate-800 p-2.5 font-semibold">GodLike Esports</td>
      <td class="border border-slate-200 dark:border-slate-800 p-2.5 text-center">12</td>
      <td class="border border-slate-200 dark:border-slate-800 p-2.5 text-center">2</td>
      <td class="border border-slate-200 dark:border-slate-800 p-2.5 text-center">52</td>
      <td class="border border-slate-200 dark:border-slate-800 p-2.5 text-center font-black text-(--ed-blue)">108</td>
    </tr>
  </tbody>
</table>`;
    editor.chain().focus().insertContent(tableHtml).run();
    setEmbedModalOpen(false);
  };

  const insertTwitterEmbed = () => {
    const raw = embedTweetUrl.trim();
    if (!raw || !editor) return;

    let html = raw;
    if (!raw.includes('<blockquote')) {
      // It's a URL
      html = `<blockquote class="twitter-tweet"><a href="${raw}">View Post on X / Twitter</a></blockquote><p></p>`;
    } else {
      // Strip out any trailing <script> tags since our frontend loads the script centrally
      html = raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim() + '<p></p>';
    }

    editor.chain().focus().insertContent(html).run();
    setEmbedTweetUrl('');
    setEmbedModalOpen(false);
  };

  const insertInstagramEmbed = () => {
    const raw = embedInstaUrl.trim();
    if (!raw || !editor) return;

    let html = raw;
    if (!raw.includes('<blockquote')) {
      // Extract permalink if query params or trailing slash exist
      const cleanUrl = raw.split('?')[0].replace(/\/+$/, '') + '/';
      const captionedAttr = embedInstaCaptioned ? ' data-instgrm-captioned' : '';
      html = `<blockquote class="instagram-media"${captionedAttr} data-instgrm-permalink="${cleanUrl}"><a href="${cleanUrl}">View Post on Instagram</a></blockquote><p></p>`;
    } else {
      // Strip out raw scripts as our ArticleView dynamically executes instgrm.Embeds.process()
      html = raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim() + '<p></p>';
    }

    editor.chain().focus().insertContent(html).run();
    setEmbedInstaUrl('');
    setEmbedModalOpen(false);
  };

  const effSlug = slugify(article?.slug || title) || 'your-article';
  const serpTitle = (metaTitle || title || 'Untitled article').slice(0, 70);
  const serpDesc = (
    metaDescription ||
    excerpt ||
    'Add an excerpt or meta description so search engines show a compelling summary…'
  ).slice(0, 170);

  /* ── Feature 6: Social Post Generators ── */
  const twitterDraft = useMemo(() => {
    const highlights = keyTakeaways.length > 0 ? `\n\nKey Highlights:\n${keyTakeaways.map((k) => `• ${k}`).join('\n')}` : '';
    const hashtagStr = tags.length > 0 ? `\n\n${tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ')}` : '';
    return `${title}${highlights}\n\n${excerpt}\n\n👉 Full story: https://esportsamaze.com/news/${effSlug}${hashtagStr}`.trim();
  }, [title, keyTakeaways, excerpt, effSlug, tags]);

  const instagramDraft = useMemo(() => {
    const bullets = keyTakeaways.map((k) => `⚡ ${k}`).join('\n');
    const tagsCloud = tags.map((t) => `#${t.replace(/\s+/g, '').toLowerCase()}`).join(' ');
    return `🔥 ${title.toUpperCase()}\n\n${subHeadline ? `${subHeadline}\n\n` : ''}${bullets ? `${bullets}\n\n` : ''}${excerpt}\n\n🔗 Link in bio to read the full breakdown on eSportsAmaze!\n\n---\n#esports #bgmi #gaming ${tagsCloud}`;
  }, [title, subHeadline, keyTakeaways, excerpt, tags]);

  const discordDraft = useMemo(() => {
    const bullets = keyTakeaways.map((k) => `> • ${k}`).join('\n');
    return `📰 **${title}**\n${subHeadline ? `*${subHeadline}*\n\n` : '\n'}${bullets ? `${bullets}\n\n` : ''}> ${excerpt}\n\n🔗 **Read Full Article:** <https://esportsamaze.com/news/${effSlug}>`;
  }, [title, subHeadline, keyTakeaways, excerpt, effSlug]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSocialType(type);
      setTimeout(() => setCopiedSocialType(null), 2500);
    } catch {
      /* ignore */
    }
  };

  /* ── Live SEO Diagnostics Engine ── */
  const seoChecklist = useMemo(() => {
    const kw = focusKeyword.trim().toLowerCase();
    const tLower = title.toLowerCase();
    const dLower = (metaDescription || excerpt || '').toLowerCase();
    const sLower = effSlug.toLowerCase();
    const bodyText = (editor?.getText() || '').toLowerCase();
    const first100Words = bodyText.split(/\s+/).slice(0, 100).join(' ');

    const hasH2 = contentHtml.includes('<h2');
    const hasH3 = contentHtml.includes('<h3');
    const hasHeadings = hasH2 || hasH3;

    const checks = [
      {
        id: 'title-len',
        label: 'Headline length (40–70 chars)',
        status: title.length >= 40 && title.length <= 70 ? 'pass' : title.length > 0 ? 'warn' : 'fail',
        score: title.length >= 40 && title.length <= 70 ? 10 : title.length > 0 ? 5 : 0,
        tip: `${title.length} / 70 characters`,
      },
      {
        id: 'kw-title',
        label: 'Focus keyword in Headline',
        status: kw && tLower.includes(kw) ? 'pass' : kw ? 'fail' : 'warn',
        score: kw && tLower.includes(kw) ? 15 : 0,
        tip: kw ? (tLower.includes(kw) ? 'Included' : 'Missing from headline') : 'Add focus keyword',
      },
      {
        id: 'kw-slug',
        label: 'Focus keyword in URL slug',
        status: kw && sLower.includes(slugify(kw)) ? 'pass' : kw ? 'warn' : 'fail',
        score: kw && sLower.includes(slugify(kw)) ? 10 : 0,
        tip: kw ? (sLower.includes(slugify(kw)) ? 'Included' : 'Missing from URL') : 'Define focus keyword',
      },
      {
        id: 'kw-desc',
        label: 'Focus keyword in Meta Description / Excerpt',
        status: kw && dLower.includes(kw) ? 'pass' : kw ? 'warn' : 'fail',
        score: kw && dLower.includes(kw) ? 10 : 0,
        tip: kw ? (dLower.includes(kw) ? 'Included' : 'Missing from snippet') : 'Add description',
      },
      {
        id: 'kw-intro',
        label: 'Focus keyword in early story (first 100 words)',
        status: kw && first100Words.includes(kw) ? 'pass' : kw ? 'warn' : 'fail',
        score: kw && first100Words.includes(kw) ? 10 : 0,
        tip: kw && first100Words.includes(kw) ? 'Found in introduction' : 'Mention focus keyword early',
      },
      {
        id: 'meta-desc-len',
        label: 'Meta Description length (120–160 chars)',
        status:
          metaDescription.length >= 120 && metaDescription.length <= 165
            ? 'pass'
            : metaDescription.length > 0
              ? 'warn'
              : 'fail',
        score:
          metaDescription.length >= 120 && metaDescription.length <= 165
            ? 10
            : metaDescription.length > 0
              ? 5
              : 0,
        tip: `${metaDescription.length} / 160 characters`,
      },
      {
        id: 'word-count',
        label: 'Content depth (300+ words)',
        status: words >= 300 ? 'pass' : words >= 150 ? 'warn' : 'fail',
        score: words >= 300 ? 15 : words >= 150 ? 8 : 0,
        tip: `${words} words written`,
      },
      {
        id: 'headings',
        label: 'Structured with Subheadings (H2 / H3)',
        status: hasHeadings ? 'pass' : 'warn',
        score: hasHeadings ? 10 : 0,
        tip: hasHeadings ? 'Proper section headers' : 'Break up text with H2 headings',
      },
      {
        id: 'alt-text',
        label: 'Cover image with descriptive Alt-Text',
        status: coverImageAlt.trim() ? 'pass' : coverImageUrl ? 'warn' : 'fail',
        score: coverImageAlt.trim() ? 10 : 0,
        tip: coverImageAlt.trim() ? 'Alt text defined' : 'Add image alt text for SEO',
      },
      {
        id: 'structured-elements',
        label: 'Interactive elements (Key Takeaways or FAQs)',
        status: keyTakeaways.length > 0 || faqs.length > 0 ? 'pass' : 'warn',
        score: keyTakeaways.length > 0 || faqs.length > 0 ? 10 : 0,
        tip:
          keyTakeaways.length > 0 || faqs.length > 0
            ? `${keyTakeaways.length} takeaways • ${faqs.length} FAQs`
            : 'Add Key Takeaways or FAQs for Google Schema',
      },
    ];

    const totalScore = Math.min(100, checks.reduce((sum, c) => sum + c.score, 0));
    return { checks, totalScore };
  }, [
    focusKeyword,
    title,
    metaDescription,
    excerpt,
    effSlug,
    editor,
    contentHtml,
    words,
    coverImageAlt,
    coverImageUrl,
    keyTakeaways,
    faqs,
  ]);

  const isLiveArticle =
    isEdit &&
    (article!.status === 'PUBLISHED' ||
      (article!.status === 'SCHEDULED' && new Date(article!.publishedAt).getTime() <= Date.now()));

  return (
    <div className="min-h-[calc(100vh-2rem)]">
      <form
        action={saveArticle}
        onSubmit={(e) => {
          try {
            if (editor && !isSourceView) {
              const currentHtml = editor.getHTML();
              setContentHtml(currentHtml);
              const contentInput = (e.currentTarget.elements.namedItem('content') as HTMLInputElement | null);
              if (contentInput) {
                contentInput.value = currentHtml;
              }
            }
            localStorage.removeItem(draftKey);
          } catch {
            /* ignore */
          }
        }}
        className="space-y-5"
      >
        {isEdit && <input type="hidden" name="id" value={article!.id} />}
        <input type="hidden" name="content" value={contentHtml} />
        <input type="hidden" name="category" value={primaryCategory} />
        <input type="hidden" name="categories" value={categoriesList.join(', ')} />
        <input type="hidden" name="tags" value={tags.join(', ')} />
        <input type="hidden" name="secondaryKeywords" value={secondaryKeywords.join(', ')} />
        <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
        <input type="hidden" name="keyTakeaways" value={keyTakeaways.join('\n')} />
        <input type="hidden" name="faqsJson" value={JSON.stringify(faqs.filter((f) => f.question && f.answer))} />

        {/* ══════════ STICKY HEADER ══════════ */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-[#0b1220]/95 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Link
                href="/admin/news"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                title="Back to News Studio"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article primary headline…"
                  className="w-full border-none bg-transparent text-lg font-black tracking-tight text-slate-900 placeholder:text-slate-300 focus:outline-none dark:text-white dark:placeholder:text-slate-600 sm:text-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Feature 6: Multi-Platform Social Auto-Formatter Trigger */}
              <button
                type="button"
                onClick={() => setSocialModalOpen(true)}
                title="Generate pre-formatted social media drafts (Twitter/X, Instagram, Discord)"
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5 text-(--ed-blue)" />
                <span className="hidden sm:inline">Socials</span>
              </button>

              {/* Feature 3: 1:1 True-to-Life In-Place Page View Mode Toggle */}
              <button
                type="button"
                onClick={() => setInPlacePageView(!inPlacePageView)}
                title="1:1 True-to-Life in-place page editor view (Esc to exit)"
                className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-all cursor-pointer ${
                  inPlacePageView
                    ? 'border-(--ed-blue) bg-(--ed-blue)/10 text-(--ed-blue)'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
              >
                {inPlacePageView ? <Minimize2 className="h-3.5 w-3.5" /> : <Layout className="h-3.5 w-3.5" />}
                <span className="hidden md:inline">{inPlacePageView ? 'Exit Page View' : '1:1 Page View'}</span>
              </button>

              {/* Status Picker with all 5 statuses */}
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-black uppercase tracking-wider focus:outline-none ${
                  status === 'PUBLISHED'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : status === 'SCHEDULED'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : status === 'PENDING_REVIEW'
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : status === 'PRIVATE'
                          ? 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : 'border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                }`}
              >
                {ARTICLE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>

              {/* Save Button */}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </div>

          {/* Sub-headline input right in header for seamless editorial flow */}
          <div className="mt-2 pl-12">
            <input
              type="text"
              name="subHeadline"
              value={subHeadline}
              onChange={(e) => setSubHeadline(e.target.value)}
              placeholder="Sub-headline / Standfirst: Expands on the hook or provides critical context…"
              className="w-full border-none bg-transparent text-sm font-medium text-slate-500 placeholder:text-slate-400 focus:outline-none dark:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          {/* Editorial Target Progress Bar */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2.5 pl-12 text-[11px] font-semibold text-slate-400 dark:border-white/5">
            <div className="flex items-center gap-3">
              <span className="truncate">/news/{effSlug}</span>
              {isEdit && (
                <>
                  <span>•</span>
                  <span>{article!.views} views</span>
                  <Link
                    href={isLiveArticle ? `/news/${article!.slug}` : `/admin/news/${article!.id}/preview`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-(--ed-blue) hover:underline"
                  >
                    <Eye className="h-3 w-3" /> Live Preview
                  </Link>
                </>
              )}
            </div>

            {/* Feature 5: Target length & Read Time Meter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500">
                  {words} / {wordTarget} words ({wordProgressPct}%)
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div
                    className={`h-full transition-all ${
                      words >= wordTarget ? 'bg-emerald-500' : 'bg-(--ed-blue)'
                    }`}
                    style={{ width: `${wordProgressPct}%` }}
                  />
                </div>
              </div>

              <span>•</span>

              <span className="font-bold text-slate-500">~{readTime} min read</span>

              <span>•</span>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SEO:</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    seoChecklist.totalScore >= 80
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : seoChecklist.totalScore >= 50
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-rose-500/10 text-rose-500'
                  }`}
                >
                  {seoChecklist.totalScore}/100
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications & banners */}
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            {error === 'required' ? 'Title and article body are required.' : 'Failed to save article. Check your inputs.'}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Article saved successfully.
          </div>
        )}
        {restored && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs font-bold text-blue-600 dark:text-blue-400">
            <History className="h-4 w-4" /> Revision restored into editor. Previous state was backed up as a new revision.
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

        {/* ══════════ MAIN CONTENT AREA ══════════ */}
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
          {/* ────────── Left/Main column ────────── */}
          <div className="space-y-5">
            {/* Key Takeaways (TL;DR Box) Builder */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Key Takeaways / TL;DR Box
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {keyTakeaways.length}/6 bullets (boosts reader retention)
                </span>
              </div>
              <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
                Display high-impact bullet takeaways in a styled callout box right below the article headline.
              </p>

              {keyTakeaways.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {keyTakeaways.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs font-medium dark:border-white/5 dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--ed-blue)/10 text-[10px] font-black text-(--ed-blue)">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">{point}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTakeaway(idx)}
                        className="text-slate-400 hover:text-rose-500"
                        title="Remove takeaway"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {keyTakeaways.length < 6 && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTakeawayInput}
                    onChange={(e) => setNewTakeawayInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTakeaway();
                      }
                    }}
                    placeholder="Add a key takeaway bullet point and press Enter…"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={addTakeaway}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              )}
            </div>

            {/* Editor Container with Raw HTML Toggle & 1:1 Page Editor Mode */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              {/* Editor Toolbar - Sticky so writers never have to scroll back up */}
              <div className="sticky top-[108px] z-20 flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/95 px-3 py-2 backdrop-blur-md shadow-xs dark:border-white/10 dark:bg-[#0b1220]/95 rounded-t-2xl">
                {!isSourceView ? (
                  <>
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

                    {/* Feature 7: Insert In-Body Image with Caption */}
                    <ToolbarButton
                      title="Insert Image with Caption"
                      onClick={() => setBodyImageModalOpen(true)}
                      disabled={!editor}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton title="Embed YouTube video" onClick={embedYoutube} disabled={!editor}>
                      <Video className="h-4 w-4" />
                    </ToolbarButton>

                    <button
                      type="button"
                      onClick={() => setEmbedModalOpen(true)}
                      title="Embed Twitter/X, Instagram, Table, or Live Esports Standings"
                      disabled={!editor}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-(--ed-blue)/30 bg-(--ed-blue)/10 px-2 py-1 text-xs font-black text-(--ed-blue) transition-colors hover:bg-(--ed-blue)/20 cursor-pointer disabled:opacity-50"
                    >
                      <Braces className="h-3.5 w-3.5" />
                      <span>Embed</span>
                    </button>

                    <ToolbarButton
                      title="Insert Esports Standings Table"
                      onClick={insertTableTemplate}
                      disabled={!editor}
                    >
                      <Table className="h-4 w-4" />
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
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <FileCode className="h-4 w-4" />
                    <span>Raw HTML Source Mode Active (Direct Code Editing)</span>
                  </div>
                )}

                {/* Feature 2: Raw HTML Source Code Toggle Button */}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSourceView}
                    title={isSourceView ? 'Switch back to WYSIWYG Editor' : 'Switch to Raw HTML Code View (< >)'}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black transition-colors cursor-pointer ${
                      isSourceView
                        ? 'bg-amber-500 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                    }`}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>{isSourceView ? 'WYSIWYG' : '< > HTML'}</span>
                  </button>
                </div>
              </div>

              {/* Editor Content Area (WYSIWYG or Raw HTML Textarea) */}
              {!isSourceView ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="p-4 bg-slate-950">
                  <textarea
                    rows={18}
                    value={contentHtml}
                    onChange={(e) => setContentHtml(e.target.value)}
                    placeholder="Enter custom HTML code here…"
                    className="w-full font-mono text-xs leading-relaxed text-emerald-400 bg-transparent border-none focus:outline-none resize-y"
                    spellCheck={false}
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Direct HTML mode: all tags, tables, figures, and embeds are preserved.</span>
                    <button
                      type="button"
                      onClick={toggleSourceView}
                      className="text-(--ed-blue) hover:underline font-bold"
                    >
                      Return to Visual Editor ➔
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Excerpt / Standfirst */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="mb-1 flex items-center justify-between">
                <label className={labelCls + ' mb-0'}>Excerpt / Standfirst (News feed cards & search snippets)</label>
                <LengthMeter value={excerpt.length} ideal={160} max={220} />
              </div>
              <textarea
                name="excerpt"
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="One or two punchy sentences summarizing the story — displayed on news cards, search snippets, and social embeds."
                className={inputCls}
              />
            </div>

            {/* Interactive Frequently Asked Questions (FAQ) Builder */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Frequently Asked Questions (FAQ)
                  </h3>
                </div>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Google FAQPage Schema
                </span>
              </div>
              <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
                FAQs display as an interactive accordion on the article and emit structured Google `FAQPage` JSON-LD schema for rich SERP drop-downs.
              </p>

              {faqs.length > 0 ? (
                <div className="mb-3 space-y-3">
                  {faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-white/10 dark:bg-white/[0.02]"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500">FAQ Item #{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveFaq(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 dark:hover:text-slate-200"
                            title="Move up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFaq(idx, 'down')}
                            disabled={idx === faqs.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 dark:hover:text-slate-200"
                            title="Move down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFaq(idx)}
                            className="p-1 text-rose-400 hover:text-rose-600"
                            title="Delete FAQ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                        placeholder="Question (e.g. When do the BGMS 2026 Grand Finals start?)"
                        className={`${inputCls} mb-2 font-semibold`}
                      />
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                        placeholder="Concise, factual answer for search engines and readers…"
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-white/10">
                  No FAQs added yet. Adding 2–4 FAQs earns rich snippet eligibility on Google.
                </div>
              )}

              <button
                type="button"
                onClick={addFaq}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add FAQ Item
              </button>
            </div>
          </div>

          {/* ────────── Right Sidebar ────────── */}
          <div className="space-y-5">
            {/* Publish Settings */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <h3 className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Publish Settings</h3>

              <label className={labelCls}>Publish Date & Time</label>
              <input
                type="datetime-local"
                name="publishedAt"
                value={publishedAtLocal}
                onChange={(e) => setPublishedAtLocal(e.target.value)}
                className={inputCls}
              />
              {status === 'SCHEDULED' && (
                <p className="mt-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Goes live automatically once this time arrives.
                </p>
              )}

              <div className="mt-3 space-y-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="featured"
                    defaultChecked={article?.featured ?? false}
                    className="h-4 w-4 rounded border-slate-300 text-(--ed-blue) focus:ring-(--ed-blue)"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Featured Story (Top Carousel / Banner)
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="allowComments"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-(--ed-blue) focus:ring-(--ed-blue)"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Allow Reader Comments
                  </span>
                </label>
              </div>

              {/* Feature 5: Word Target Preset Picker */}
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/5">
                <label className={labelCls}>Editorial Word Target</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {WORD_TARGET_PRESETS.map((p) => (
                    <button
                      key={p.target}
                      type="button"
                      onClick={() => setWordTarget(p.target)}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition-all ${
                        wordTarget === p.target
                          ? 'border-(--ed-blue) bg-(--ed-blue)/10 text-(--ed-blue)'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400'
                      }`}
                    >
                      {p.label} ({p.target}w)
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-(--ed-blue) py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:opacity-90 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isEdit ? 'Save Changes' : 'Create Article'}
              </button>
            </div>

            {/* Feature 4: Live Auto-Generated Table of Contents */}
            {headings.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <ListTree className="h-3.5 w-3.5 text-(--ed-blue)" /> Table of Contents ({headings.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => insertShortcode('[toc]')}
                    className="text-[10px] font-bold text-(--ed-blue) hover:underline"
                    title="Insert in-content TOC box"
                  >
                    + Insert in Story
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  {headings.map((h, i) => (
                    <div
                      key={h.id}
                      className={`truncate text-slate-600 dark:text-slate-400 ${
                        h.level === 3 ? 'pl-3 text-[11px]' : 'font-semibold'
                      }`}
                    >
                      <span className="text-slate-400">{i + 1}.</span> {h.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cover Image & Metadata */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <h3 className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Hero & Cover Image</h3>

              {coverImageUrl ? (
                <div className="relative mb-2 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt={coverImageAlt || 'Cover preview'} className="h-32 w-full object-cover" />
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
                name="coverImageFile"
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
                  {coverUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}{' '}
                  Upload
                </button>
              </div>

              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="…or paste image URL"
                className={`${inputCls} text-xs mb-3`}
              />

              {/* Alt Text, Caption & Credit */}
              <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-white/5">
                <div>
                  <label className={labelCls}>Alt Text (SEO & Accessibility)</label>
                  <input
                    type="text"
                    name="coverImageAlt"
                    value={coverImageAlt}
                    onChange={(e) => setCoverImageAlt(e.target.value)}
                    placeholder="e.g. Team Soul celebrating BGMS Championship trophy"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Photo Caption</label>
                  <input
                    type="text"
                    name="coverImageCaption"
                    value={coverImageCaption}
                    onChange={(e) => setCoverImageCaption(e.target.value)}
                    placeholder="e.g. Soul lifting their second consecutive title in Delhi"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Photo Credit / Source</label>
                  <input
                    type="text"
                    name="coverImageCredit"
                    value={coverImageCredit}
                    onChange={(e) => setCoverImageCredit(e.target.value)}
                    placeholder="e.g. Krafton India / Nodwin Gaming"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Feature 1: Type-to-Add Custom & Multiple/Nested Categories */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Categories & Hierarchy</h3>
                <span className="text-[10px] font-bold text-slate-400">Nested e.g. BGMI &gt; Rosters</span>
              </div>

              {/* Categories list chips */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {categoriesList.map((cat) => {
                  const isPrimary = cat === primaryCategory;
                  return (
                    <span
                      key={cat}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        isPrimary
                          ? 'bg-(--ed-blue) text-white'
                          : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setPrimaryCategory(cat)}
                        title={isPrimary ? 'Primary Category' : 'Click to make Primary'}
                        className="hover:underline"
                      >
                        {formatCategoryDisplay(cat)} {isPrimary && '(Primary)'}
                      </button>
                      {categoriesList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCategory(cat)}
                          className="text-white/80 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* Type-to-add category input */}
              <div className="flex items-center gap-1.5 mb-2">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                  placeholder="Type custom/nested category (e.g. BGMI > Rosters)…"
                  className={`${inputCls} text-xs`}
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Quick Preset Suggester */}
              <div className="flex flex-wrap gap-1">
                {ARTICLE_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      if (!categoriesList.includes(c.value)) {
                        setCategoriesList([...categoriesList, c.value]);
                      }
                    }}
                    className="rounded border border-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 hover:border-slate-300 dark:border-white/5"
                  >
                    + {c.label.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Tags */}
              <label className={`${labelCls} mt-4`}>Article Tags</label>
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
                  placeholder={tags.length === 0 ? 'Type tag + Enter…' : 'Add tag…'}
                  className="min-w-[100px] flex-1 border-none bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                />
              </div>

              {/* Author & Role */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Author Name</label>
                  <input
                    type="text"
                    name="authorName"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Author Role</label>
                  <input
                    type="text"
                    name="authorRole"
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value)}
                    placeholder="e.g. Senior Analyst"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Context links: Tournament, Team, and Player */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <h3 className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Linked Esports Entities</h3>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Linked Tournament</label>
                  <Combobox
                    name="tournamentId"
                    options={tournamentOptions}
                    defaultValue={article?.tournamentId ?? ''}
                    placeholder="Select tournament…"
                    searchUrl={linkedSearchUrl ? `${linkedSearchUrl}?type=tournament` : undefined}
                  />
                </div>
                <div>
                  <label className={labelCls}>Linked Team / Squad</label>
                  <Combobox
                    name="teamId"
                    options={teamOptions}
                    defaultValue={article?.teamId ?? ''}
                    placeholder="Select squad…"
                    searchUrl={linkedSearchUrl ? `${linkedSearchUrl}?type=team` : undefined}
                  />
                </div>
                <div>
                  <label className={labelCls}>Linked Player (Dossier Card)</label>
                  <Combobox
                    name="playerId"
                    options={playerOptions}
                    defaultValue={article?.playerId ?? ''}
                    placeholder="Select player (e.g. Manya, Jonathan)…"
                    searchUrl={linkedSearchUrl ? `${linkedSearchUrl}?type=player` : undefined}
                  />
                </div>
              </div>
            </div>

            {/* SEO & Diagnostic Scorecard */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">SEO Scorecard & Checklist</h3>
                <div
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${
                    seoChecklist.totalScore >= 80
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : seoChecklist.totalScore >= 50
                        ? 'bg-amber-500/15 text-amber-500'
                        : 'bg-rose-500/15 text-rose-500'
                  }`}
                >
                  <Search className="h-3 w-3" />
                  <span>{seoChecklist.totalScore} / 100</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className={`h-full transition-all duration-300 ${
                    seoChecklist.totalScore >= 80
                      ? 'bg-emerald-500'
                      : seoChecklist.totalScore >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                  style={{ width: `${seoChecklist.totalScore}%` }}
                />
              </div>

              {/* Checklist items */}
              <div className="mb-4 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-[11px] dark:border-white/5 dark:bg-white/[0.02]">
                {seoChecklist.checks.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 py-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          c.status === 'pass'
                            ? 'bg-emerald-500'
                            : c.status === 'warn'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                      />
                      <span className="truncate text-slate-700 dark:text-slate-300">{c.label}</span>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">{c.tip}</span>
                  </div>
                ))}
              </div>

              {/* Slug */}
              <label className={labelCls}>URL Slug (blank = auto from headline)</label>
              <input
                type="text"
                name="slug"
                defaultValue={article?.slug ?? ''}
                placeholder={slugify(title) || 'auto-generated'}
                className={inputCls}
              />
              <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">/news/{effSlug}</p>

              {/* Focus Keyword */}
              <label className={`${labelCls} mt-3`}>Focus Keyword</label>
              <input
                type="text"
                name="focusKeyword"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="e.g. BGMS 2026 Grand Finals"
                className={inputCls}
              />

              {/* Secondary Keywords */}
              <label className={`${labelCls} mt-3`}>Secondary Keywords</label>
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                {secondaryKeywords.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-300"
                  >
                    {k}
                    <button
                      type="button"
                      onClick={() => setSecondaryKeywords(secondaryKeywords.filter((x) => x !== k))}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  value={secKeywordDraft}
                  onChange={(e) => setSecKeywordDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      commitSecKeyword();
                    }
                  }}
                  onBlur={commitSecKeyword}
                  placeholder={secondaryKeywords.length === 0 ? 'Secondary keyword + Enter…' : 'Add…'}
                  className="min-w-[80px] flex-1 border-none bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                />
              </div>

              {/* Meta Title */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label className={labelCls + ' mb-1'}>Meta Title</label>
                  <LengthMeter value={metaTitle.length} ideal={60} max={70} />
                </div>
                <input
                  type="text"
                  name="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title ? title.slice(0, 60) : 'Falls back to headline'}
                  className={inputCls}
                />
              </div>

              {/* Meta Description */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label className={labelCls + ' mb-1'}>Meta Description</label>
                  <LengthMeter value={metaDescription.length} ideal={155} max={170} />
                </div>
                <textarea
                  name="metaDescription"
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Falls back to excerpt"
                  className={inputCls}
                />
              </div>

              {/* SERP Search Preview */}
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Google SERP Preview</div>
                <div className="mt-1.5 truncate text-[11px] text-emerald-700 dark:text-emerald-400">
                  esportsamaze.com › news › {effSlug}
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-[#1a0dab] dark:text-blue-300">{serpTitle}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600 dark:text-slate-400">{serpDesc}</div>
              </div>

              {/* Social Image Override */}
              <label className={`${labelCls} mt-3`}>Social Card Image Override (OpenGraph / X)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="ogImage"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="Falls back to cover image"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => openPicker('og-image')}
                  title="Pick an existing image from the media library"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Library
                </button>
              </div>
            </div>

            {/* Revision History */}
            {isEdit && revisions && revisions.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <History className="h-3.5 w-3.5" /> Revision History
                  <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                    {revisions.length}
                  </span>
                </h3>
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
                            title="View snapshot"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={restoringRevision !== null}
                            onClick={async () => {
                              if (!window.confirm('Restore this revision? The current state will be saved as a new revision first.'))
                                return;
                              setRestoringRevision(rev.id);
                              try {
                                await restoreRevisionById(article!.id, rev.id);
                              } finally {
                                setRestoringRevision(null);
                              }
                            }}
                            title="Restore version"
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

            {/* Actions: Duplicate to Draft & Danger Zone */}
            {isEdit && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                  <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Story Actions</h3>
                  <button
                    type="submit"
                    formAction={duplicateArticle}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    <Copy className="h-3.5 w-3.5 text-blue-500" />
                    Duplicate to Draft
                  </button>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-950/10">
                  <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Danger Zone
                  </h3>
                  <button
                    type="submit"
                    formAction={deleteArticle}
                    onSubmit={(e) => {
                      if (!window.confirm('Move this article to trash? It will disappear from the public site until restored.'))
                        e.preventDefault();
                    }}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white py-2 text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-transparent dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Move to Trash
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════ FEATURE 3: 1:1 TRUE-TO-LIFE IN-PLACE PAGE VIEW ══════════ */}
        {inPlacePageView && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] overflow-y-auto">
            {/* Sticky Floating Control Bar */}
            <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ed-hair)] bg-white/95 px-6 py-2.5 backdrop-blur-md dark:bg-[#0b1220]/95 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>1:1 True-to-Life In-Place Page Editor</span>
                <span className="rounded bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] text-slate-500 font-mono">
                  {words} words • ~{readTime}m read
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSourceView}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5"
                >
                  {isSourceView ? 'Visual' : '< > Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setSocialModalOpen(true)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5"
                >
                  Socials
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-(--ed-blue) px-3 py-1 text-xs font-black uppercase text-white hover:opacity-90 cursor-pointer"
                >
                  Save Story
                </button>
                <button
                  type="button"
                  onClick={() => setInPlacePageView(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-white/10"
                  title="Exit Page View (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Public Layout Container */}
            <div className="mx-auto w-full max-w-[var(--page-max-width)] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
              <div className="mx-auto max-w-4xl">
                {/* Category & Date Pill */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-500">
                    {formatCategoryDisplay(primaryCategory)}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {new Date(publishedAtLocal).toLocaleDateString()}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    • ~{readTime} min read
                  </span>
                </div>

                {/* Inline Editable Headline */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Click here to edit headline…"
                  className="mt-4 w-full border-none bg-transparent font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl sm:leading-tight lg:text-[2.75rem] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-(--ed-blue) rounded-lg p-1"
                />

                {/* Inline Editable Sub-Headline */}
                <input
                  type="text"
                  value={subHeadline}
                  onChange={(e) => setSubHeadline(e.target.value)}
                  placeholder="Click here to edit sub-headline…"
                  className="mt-2 w-full border-none bg-transparent text-base font-semibold leading-snug text-slate-600 dark:text-slate-300 sm:text-xl focus:outline-none focus:ring-1 focus:ring-(--ed-blue) rounded-lg p-1"
                />

                {/* Inline Editable Excerpt */}
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Click to edit excerpt…"
                  className="mt-4 w-full border-l-2 border-(--ed-blue) pl-4 bg-transparent text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-(--ed-blue) rounded-r-lg"
                />

                {/* Key Takeaways Box in Live Context */}
                {keyTakeaways.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-sand)]/50 p-5 shadow-xs dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Key Takeaways
                    </div>
                    <ul className="mt-3 space-y-2">
                      {keyTakeaways.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm font-medium">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--ed-blue)/10 text-[11px] font-black text-(--ed-blue)">
                            ✓
                          </span>
                          <span className="leading-snug">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Byline Bar */}
                <div className="mt-6 flex items-center justify-between border-y border-slate-200 py-4 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-extrabold dark:bg-white/10">
                      {authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{authorName}</div>
                      <div className="text-[11px] text-slate-400">{authorRole}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSocialModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold dark:border-white/10 dark:bg-white/5"
                    >
                      <Share2 className="h-3 w-3" /> Share Preview
                    </button>
                  </div>
                </div>

                {/* Hero Cover Image & In-Place Captions */}
                {coverImageUrl && (
                  <div className="mt-8">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#0f1216] dark:border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverImageUrl} alt={coverImageAlt || title} className="max-h-[520px] w-full object-cover" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
                      <span className="italic">{coverImageCaption || 'No photo caption set'}</span>
                      {coverImageCredit && (
                        <span className="font-semibold uppercase tracking-wider text-[10px]">
                          Photo: {coverImageCredit}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* In-Place Tiptap Body */}
                <div className="mt-8">
                  {!isSourceView ? (
                    <EditorContent editor={editor} />
                  ) : (
                    <textarea
                      rows={16}
                      value={contentHtml}
                      onChange={(e) => setContentHtml(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 focus:outline-none"
                    />
                  )}
                </div>

                {/* In-Place FAQ Preview */}
                {faqs.length > 0 && (
                  <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0b1220]">
                    <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider">
                      <HelpCircle className="h-4 w-4 text-emerald-500" />
                      Frequently Asked Questions ({faqs.length})
                    </div>
                    <div className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
                      {faqs.map((f, i) => (
                        <div key={i} className="py-3">
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{f.question}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{f.answer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* ══════════ FEATURE 6: MULTI-PLATFORM SOCIAL FORMATTER MODAL ══════════ */}
      {socialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#0f172a]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                <Share2 className="h-4 w-4 text-(--ed-blue)" />
                Multi-Platform Social Auto-Formatter
              </h3>
              <button
                type="button"
                onClick={() => setSocialModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              One-click copy tailored posts formatted for your social channels with character counters and hashtag clouds.
            </p>

            <div className="space-y-4">
              {/* Twitter / X */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">Twitter / X Post</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black ${
                        twitterDraft.length <= 280 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {twitterDraft.length} / 280 chars
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(twitterDraft, 'twitter')}
                      className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                    >
                      {copiedSocialType === 'twitter' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedSocialType === 'twitter' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-slate-600 dark:text-slate-300">
                  {twitterDraft}
                </pre>
              </div>

              {/* Instagram */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">Instagram Caption</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(instagramDraft, 'instagram')}
                    className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                  >
                    {copiedSocialType === 'instagram' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedSocialType === 'instagram' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-slate-600 dark:text-slate-300">
                  {instagramDraft}
                </pre>
              </div>

              {/* Discord */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">Discord Announcement</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(discordDraft, 'discord')}
                    className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                  >
                    {copiedSocialType === 'discord' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedSocialType === 'discord' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-slate-600 dark:text-slate-300">
                  {discordDraft}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ FEATURE 7: IN-BODY IMAGE WITH CAPTION DIALOG ══════════ */}
      {bodyImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#0f172a]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                <ImagePlus className="h-4 w-4 text-(--ed-blue)" />
                Insert Article Body Image with Caption
              </h3>
              <button
                type="button"
                onClick={() => setBodyImageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bodyImageUrl}
                    onChange={(e) => setBodyImageUrl(e.target.value)}
                    placeholder="https://... or choose from library"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => openPicker('body-dialog')}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300"
                  >
                    <Library className="h-3.5 w-3.5" /> Library
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Alt Text (SEO & Screen Readers)</label>
                <input
                  type="text"
                  value={bodyImageAlt}
                  onChange={(e) => setBodyImageAlt(e.target.value)}
                  placeholder="e.g. Jonathan clutching zone 6 rotation"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Caption (Rendered below the image)</label>
                <input
                  type="text"
                  value={bodyImageCaption}
                  onChange={(e) => setBodyImageCaption(e.target.value)}
                  placeholder="e.g. Map 4: Jonathan securing the 1v2 elimination"
                  className={inputCls}
                />
              </div>

              {bodyImageUrl && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bodyImageUrl} alt="Preview" className="h-28 w-full object-cover" />
                  {bodyImageCaption && (
                    <div className="bg-slate-50 p-2 text-center text-xs italic text-slate-500 dark:bg-white/5">
                      {bodyImageCaption}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setBodyImageModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={insertBodyImageWithCaption}
                  disabled={!bodyImageUrl.trim()}
                  className="rounded-lg bg-(--ed-blue) px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-50"
                >
                  Insert Figure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Dialog */}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handleMediaPick}
        title={
          pickerTarget === 'cover'
            ? 'Choose Cover Image'
            : pickerTarget === 'og-image'
              ? 'Choose Social Card Image'
              : 'Select Image'
        }
        prefix="news"
      />

      {/* Embeds & Shortcodes Dialog */}
      {embedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#0f172a]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                <Table className="h-4 w-4 text-(--ed-blue)" />
                Insert Rich Embed or Widget
              </h3>
              <button
                type="button"
                onClick={() => setEmbedModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex border-b border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setEmbedTab('shortcode')}
                className={`border-b-2 px-3 py-2 text-xs font-bold transition-all ${
                  embedTab === 'shortcode'
                    ? 'border-(--ed-blue) text-(--ed-blue)'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Esports Shortcodes
              </button>
              <button
                type="button"
                onClick={() => setEmbedTab('social')}
                className={`border-b-2 px-3 py-2 text-xs font-bold transition-all ${
                  embedTab === 'social'
                    ? 'border-(--ed-blue) text-(--ed-blue)'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Twitter / Instagram
              </button>
              <button
                type="button"
                onClick={() => setEmbedTab('table')}
                className={`border-b-2 px-3 py-2 text-xs font-bold transition-all ${
                  embedTab === 'table'
                    ? 'border-(--ed-blue) text-(--ed-blue)'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Data Table
              </button>
            </div>

            {/* Tab content */}
            {embedTab === 'shortcode' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-500 dark:text-slate-400">
                  Insert interactive dynamic esports widgets that automatically render live statistics and dossiers in the article:
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => insertShortcode('[standings]')}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">[standings]</div>
                      <div className="text-[11px] text-slate-400">Renders live tournament leaderboard standings table</div>
                    </div>
                    <Plus className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => insertShortcode('[match-scorecard match="1"]')}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">[match-scorecard match=&quot;1&quot;]</div>
                      <div className="text-[11px] text-slate-400">Displays full match breakdown and elimination stats</div>
                    </div>
                    <Plus className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => insertShortcode('[team-card team="Team Soul"]')}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">[team-card team=&quot;Team Soul&quot;]</div>
                      <div className="text-[11px] text-slate-400">Renders rich squad dossier with active roster</div>
                    </div>
                    <Plus className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => insertShortcode('[player-card player="Manya"]')}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">[player-card player=&quot;Manya&quot;]</div>
                      <div className="text-[11px] text-slate-400">Renders player performance profile card</div>
                    </div>
                    <Plus className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => insertShortcode('[toc]')}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">[toc]</div>
                      <div className="text-[11px] text-slate-400">Inserts auto-generated Table of Contents accordion</div>
                    </div>
                    <Plus className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            )}

            {embedTab === 'social' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500 dark:text-slate-400">
                  Paste either the direct post URL or the full embed code copied from Twitter/X or Instagram.
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                  <label className={labelCls}>Embed Tweet / Post on X</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={embedTweetUrl}
                      onChange={(e) => setEmbedTweetUrl(e.target.value)}
                      placeholder="Paste X/Twitter URL or &lt;blockquote&gt; embed code…"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={insertTwitterEmbed}
                      className="rounded-lg bg-(--ed-blue) px-3 text-xs font-bold text-white hover:opacity-90 cursor-pointer shrink-0"
                    >
                      Insert Tweet
                    </button>
                  </div>
                  <span className="mt-1 block text-[10px] text-slate-400">e.g. https://x.com/NODWINGaming/status/123456789</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                  <label className={labelCls}>Embed Instagram Post / Reel</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={embedInstaUrl}
                      onChange={(e) => setEmbedInstaUrl(e.target.value)}
                      placeholder="Paste Instagram post URL or &lt;blockquote&gt; embed code…"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={insertInstagramEmbed}
                      className="rounded-lg bg-(--ed-blue) px-3 text-xs font-bold text-white hover:opacity-90 cursor-pointer shrink-0"
                    >
                      Insert Post
                    </button>
                  </div>
                  <label className="mt-2.5 flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={embedInstaCaptioned}
                      onChange={(e) => setEmbedInstaCaptioned(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-(--ed-blue) focus:ring-(--ed-blue)"
                    />
                    <span>Include caption & hashtags (uncheck for clean visual graphic only)</span>
                  </label>
                  <span className="mt-1 block text-[10px] text-slate-400">e.g. https://www.instagram.com/p/Dc8yW21E8I_/</span>
                </div>
              </div>
            )}

            {embedTab === 'table' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-500 dark:text-slate-400">
                  Insert a responsive, pre-styled esports data table into the editor. You can edit the cells directly in the WYSIWYG editor or in Raw HTML mode.
                </p>
                <button
                  type="button"
                  onClick={insertTableTemplate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-(--ed-blue) py-2.5 font-bold text-white shadow-sm hover:opacity-90"
                >
                  <Table className="h-4 w-4" />
                  Insert Pre-Styled Data Table
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
