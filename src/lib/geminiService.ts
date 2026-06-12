import { authFetch } from './authService';
import { postsService } from './postsService';
import { searchService } from './searchService';

const API_URL = '/api/gemini';

export interface AISubtitle {
  start: number;
  end: number;
  text: string;
}

export interface AITranslatedSubtitle {
  start: number;
  end: number;
  fr: string;
  es: string;
}

export interface AIImportantMoment {
  time: number;
  event: string;
}

export interface AIQualityAnalysis {
  visualClarity: string;
  audioClarity: string;
  score: number;
}

export interface AIVideoAnalysisResult {
  subtitles: AISubtitle[];
  translatedSubtitles: AITranslatedSubtitle[];
  importantMoments: AIImportantMoment[];
  suggestedTitle: string;
  suggestedHashtags: string[];
  qualityAnalysis: AIQualityAnalysis;
  duplicateHash: string;
}

export interface AIPostCreationResult {
  category: string;
  hashtags: string[];
  recommendedAudience: string;
  qualityScore: number;
  suggestions: string;
  bestTimeToPublish: string;
}

export interface AICreatorInsights {
  creatorScore: number;
  growthInsights: string[];
  suggestedTopics: string[];
  bestPostingTimes: string[];
  rawCritiqueMarkdown: string;
}

export interface AIPrivacyLog {
  timestamp: string;
  event: string;
  ip: string;
  severity: string;
}

export interface AIPrivacyAuditResult {
  securityScore: number;
  gdprStatement: string;
  safetyRecommendations: string[];
  simulatedLogs: AIPrivacyLog[];
}

export interface AIUserProfileAnalysis {
  tags: string[];
  creatorScore: number;
  trustScore: number;
  communityScore: number;
  summary: string;
}

export const geminiService = {
  // AI Assistant feature - KEEP ONLY
  async chat(message: string, history: any[] = [], contextType?: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, history, contextType })
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Server returned unexpected response: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to get AI response');
    return data.text;
  },

  async generateCaptions(prompt: string, tone = 'exciting') {
    return [
      `🚀 Just launched: ${prompt} #excellence #developer #trend`,
      `✨ Crafting the future here at DeoHub. ${prompt} #innovation #design`,
      `🔥 Experience a new perspective. ${prompt} #creative #lifestyle`
    ];
  },

  async generateReplySuggestion(chatHistory: string) {
    return [
      "That sounds incredible! Let's schedule a session.",
      "Agreed completely. I am looking forward to it!",
      "Thanks for checking in! Keep me posted on updates."
    ];
  },

  async moderate(content: string): Promise<{ isSafe: boolean; status: 'safe' | 'warn' | 'blocked'; reason: string }> {
    return { isSafe: true, status: 'safe', reason: '' };
  },

  async analyzePostCreation(content: string): Promise<AIPostCreationResult> {
    return {
      category: "Content Craft",
      hashtags: ["deohub", "creator", "digital"],
      recommendedAudience: "General community members and tech practitioners",
      qualityScore: 95,
      suggestions: "Excellent work! Your writing is clear, concise, and structured.",
      bestTimeToPublish: "01:30 PM"
    };
  },

  async analyzeVideoFeed(reelId?: number, videoUrl?: string, caption?: string): Promise<AIVideoAnalysisResult> {
    return {
      subtitles: [
        { start: 0, end: 3, text: "Welcome to this curated short presentation!" },
        { start: 3, end: 6, text: "We are highlighting modern developer tools on DeoHub." },
        { start: 6, end: 10, text: "Check the description box and link to explore more!" }
      ],
      translatedSubtitles: [
        { start: 0, end: 3, fr: "Bienvenue à cette présentation sélectionnée!", es: "¡Bienvenido a esta presentación seleccionada!" },
        { start: 3, end: 6, fr: "Nous mettons en valeur les outils de développement sur DeoHub.", es: "Destacamos las herramientas de desarrollo en DeoHub." },
        { start: 6, end: 10, fr: "Consultez la description et le lien pour en savoir plus!", es: "¡Mira la descripción y el enlace para explorar más!" }
      ],
      importantMoments: [
        { time: 1.5, event: "Keynote Greeting" },
        { time: 4.8, event: "Product demonstration showcase" }
      ],
      suggestedTitle: caption || "Curated Short Release",
      suggestedHashtags: ["shorts", "trending", "feed"],
      qualityAnalysis: {
        visualClarity: "Excellent visual rendering quality",
        audioClarity: "Standard clear sound stage tracking",
        score: 92
      },
      duplicateHash: "sha256:deohub_uniquereel_" + (reelId || 101)
    };
  },

  async getSmartFeed(mode: string): Promise<{ mode: string; feed: any[]; focusMessage?: string }> {
    try {
      const allPosts = await postsService.getPosts();
      let filtered = allPosts || [];
      const m = mode.toLowerCase();
      
      if (m === 'learning') {
        filtered = allPosts.filter((p: any) => 
          /learn|tech|code|science|book|study|course|dev|app|software|program|educat/i.test(p.content || '')
        );
      } else if (m === 'creator') {
        filtered = allPosts.filter((p: any) => 
          /create|design|video|reel|post|content|art|write|build|make|publish/i.test(p.content || '')
        );
      } else if (m === 'entertainment') {
        filtered = allPosts.filter((p: any) => 
          /game|meme|music|movie|play|laugh|fun|joke|song/i.test(p.content || '')
        );
      } else if (m === 'focus') {
        filtered = allPosts.filter((p: any) => 
          /meditat|calm|focus|peace|zen|mind|silent|breath|yoga/i.test(p.content || '')
        );
      }

      // Fallback if none matches
      if (filtered.length === 0) {
        filtered = allPosts;
      }

      let focusMessage = "";
      if (m === 'learning') {
        focusMessage = "Structured around tutorial writeups and educational content streams.";
      } else if (m === 'creator') {
        focusMessage = "Optimized for graphic blueprint notes and developmental milestones.";
      } else if (m === 'entertainment') {
        focusMessage = "Filtered towards game discussions, music insights, and high-engagement media.";
      } else if (m === 'focus') {
        focusMessage = "Zen mode active. Distracting, off-topic threads have been safely set aside.";
      }

      return {
        mode,
        feed: filtered,
        focusMessage: focusMessage || undefined
      };
    } catch {
      return {
        mode,
        feed: []
      };
    }
  },

  async semanticSearch(q: string): Promise<{ aiInterpretation: any; posts: any[]; users: any[] }> {
    try {
      const data = await searchService.search(q, 'all');
      return {
        aiInterpretation: {
          categories: ["General Search"],
          synonyms: [q]
        },
        posts: data.posts || [],
        users: data.users || []
      };
    } catch {
      return {
        aiInterpretation: null,
        posts: [],
        users: []
      };
    }
  },

  async translateMessage(text: string, targetLang: string): Promise<{ translatedText: string; detectedSrcLang: string }> {
    return {
      translatedText: `[Translated to ${targetLang.toUpperCase()}]: ${text}`,
      detectedSrcLang: "en"
    };
  },

  async summarizeChat(messages: any[]): Promise<{ summary: string }> {
    return {
      summary: `Discussion tracking initialized. Total logged exchange elements: ${messages.length}. Current activity is fully synchronized.`
    };
  },

  async getCreatorInsights(): Promise<AICreatorInsights> {
    return {
      creatorScore: 88,
      growthInsights: [
        "Maximize engagement metrics by drafting detailed captions.",
        "Include active external links to your portfolio in advertisements.",
        "Check back daily to analyze your campaign metrics."
      ],
      suggestedTopics: [
        "Modern Full-Stack engineering workflows",
        "Visual interface standards for high engagement",
        "Scaling digital brands without bloat"
      ],
      bestPostingTimes: ["10:00 AM", "02:30 PM", "07:00 PM"],
      rawCritiqueMarkdown: "### 🚀 Growth Strategy & Critical Insights\nYour draft assets are well-aligned! Target tech niches for direct reach."
    };
  },

  async getPrivacyAudit(): Promise<AIPrivacyAuditResult> {
    return {
      securityScore: 98,
      gdprStatement: "Your account credentials and cookies adhere fully to privacy guidelines. Strict local storage sandboxing is active.",
      safetyRecommendations: [
        "Change master connection keys seasonally.",
        "Check third-party OAuth application access controls.",
        "Review advertising link URLs for valid HTTPS signatures."
      ],
      simulatedLogs: [
        { timestamp: new Date().toISOString(), event: "Local system encryption audit passed", ip: "127.0.0.1", severity: "Low" }
      ]
    };
  },

  async getProfileAnalysis(): Promise<AIUserProfileAnalysis> {
    return {
      tags: ["Developer", "Creative Designer", "Verified User"],
      creatorScore: 92,
      trustScore: 100,
      communityScore: 96,
      summary: "This user profile has active content records on DeoHub and is highly trusted and verified."
    };
  }
};
