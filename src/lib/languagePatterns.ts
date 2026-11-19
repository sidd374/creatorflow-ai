/**
 * Language Dictionaries and Syntactic Templates for 20+ Languages
 * Phase 2.1 — Topic Intelligence & Grammar-Safe Architecture
 */

import { TopicProfile, toTitleCase } from './topicAnalyzer';

export type TopicTarget = string | TopicProfile;

export function resolveTopic(target: TopicTarget): {
  raw: string;
  subj: string;
  act: string;
  noun: string;
  gerund: string;
  profile?: TopicProfile;
} {
  if (typeof target === 'string') {
    return {
      raw: target,
      subj: target,
      act: target,
      noun: target,
      gerund: target,
    };
  }

  return {
    raw: target.rawTopic,
    subj: target.subject,
    act: target.actionPhrase,
    noun: target.nounPhrase,
    gerund: target.gerundPhrase,
    profile: target,
  };
}

export interface LanguagePack {
  code: string;
  name: string;
  titleTemplates: {
    curiosity: (t: TopicTarget, count: number) => string;
    benefit: (t: TopicTarget) => string;
    mistake: (t: TopicTarget) => string;
    list: (t: TopicTarget, count: number) => string;
    emotional: (t: TopicTarget, count: number) => string;
  };
  hooks: {
    curiosity: (t: TopicTarget) => { spoken: string; visual: string; reason: string };
    problem: (t: TopicTarget) => { spoken: string; visual: string; reason: string };
    promise: (t: TopicTarget) => { spoken: string; visual: string; reason: string };
  };
  shortsSpoken: {
    hook: (t: TopicTarget) => string;
    setup: (t: TopicTarget) => string;
    value: (t: TopicTarget) => string;
    payoff: (t: TopicTarget) => string;
    cta: string;
  };
  thumbnailTexts: string[];
  pinnedComment: {
    starter: string;
    question: (t: TopicTarget) => string;
    cta: string;
  };
  description: {
    hookPrefix: string;
    breakdownPrefix: string;
    cta: string;
  };
  chapters: {
    intro: string;
    problem: string;
    breakdown: string;
    stepByStep: string;
    mistakes: string;
    conclusion: string;
  };
}

export const LANGUAGE_DICTIONARY: Record<string, LanguagePack> = {
  // 1. ENGLISH (Grammar-Safe & Natural)
  en: {
    code: 'EN',
    name: 'English',
    titleTemplates: {
      curiosity: (t) => {
        const { profile, act, noun, subj } = resolveTopic(t);
        if (profile?.intent === 'comparison' && profile.comparisonA && profile.comparisonB) {
          return `${profile.comparisonA} vs ${profile.comparisonB}: Which Is Actually Better?`;
        }
        if (profile?.intent === 'explanation') {
          return `The Real Reason ${subj} ${profile.issueOrQuestion ? 'Happens' : 'Gets Overlooked'}`;
        }
        if (profile?.intent === 'recommendation') {
          return `The Best ${toTitleCase(noun)} Nobody Is Talking About`;
        }
        if (profile?.intent === 'tutorial') {
          const cleanAct = act.replace(/\byour\b/i, 'a');
          return `Why Most Creators Struggle to ${toTitleCase(cleanAct)}`;
        }
        return `Nobody Tells You This About ${toTitleCase(noun)}`;
      },
      benefit: (t) => {
        const { profile, act, noun } = resolveTopic(t);
        if (profile?.intent === 'comparison' && profile.comparisonA && profile.comparisonB) {
          return `Which Should You Choose? ${profile.comparisonA} vs ${profile.comparisonB}`;
        }
        if (profile?.intent === 'explanation') {
          return `Understanding ${toTitleCase(noun)} Once and for All`;
        }
        if (profile?.intent === 'recommendation') {
          return `How to Choose the Best ${toTitleCase(noun)}`;
        }
        if (profile?.intent === 'tutorial') {
          return `How to ${toTitleCase(act)} (Step-by-Step Guide)`;
        }
        return `How to Master ${toTitleCase(noun)} in Less Time`;
      },
      mistake: (t) => {
        const { profile, noun, subj } = resolveTopic(t);
        if (profile?.intent === 'comparison' && profile.comparisonA && profile.comparisonB) {
          return `Stop Picking the Wrong Option: ${profile.comparisonA} vs ${profile.comparisonB}`;
        }
        if (profile?.intent === 'explanation') {
          return `Why ${subj} Struggles — And What to Do`;
        }
        if (profile?.intent === 'tutorial') {
          if (/youtube/i.test(subj)) {
            return `Why Your YouTube Channel Isn't Growing — And What to Do`;
          }
          return `Stop Making These Common ${toTitleCase(noun)} Mistakes`;
        }
        return `Stop Making These ${toTitleCase(noun)} Mistakes`;
      },
      list: (t, c) => {
        const { profile, act, noun } = resolveTopic(t);
        if (profile?.intent === 'comparison' && profile.comparisonA && profile.comparisonB) {
          return `${c} Key Differences: ${profile.comparisonA} vs ${profile.comparisonB}`;
        }
        if (profile?.intent === 'recommendation') {
          return `${c} ${toTitleCase(noun)} You Need to Try`;
        }
        if (profile?.intent === 'tutorial') {
          return `${c} Simple Ways to ${toTitleCase(act)} Faster`;
        }
        return `${c} Practical Rules for ${toTitleCase(noun)}`;
      },
      emotional: (t, c) => {
        const { profile, gerund, noun } = resolveTopic(t);
        if (profile?.intent === 'comparison' && profile.comparisonA && profile.comparisonB) {
          return `I Tested Both: ${profile.comparisonA} vs ${profile.comparisonB}`;
        }
        if (profile?.intent === 'recommendation') {
          return `I Tested ${c} ${toTitleCase(noun)} So You Don't Have To`;
        }
        if (profile?.intent === 'tutorial') {
          const cleanGerund = gerund.replace(/\byour\b/i, 'a');
          return `I Tried ${toTitleCase(cleanGerund)} for 30 Days (Here's What Happened)`;
        }
        return `I Tested Every Strategy for ${toTitleCase(noun)}... Here’s The Truth`;
      },
    },
    hooks: {
      curiosity: (t) => {
        const { profile, subj, raw } = resolveTopic(t);
        if (profile?.intent === 'comparison' && profile.comparisonA && profile.comparisonB) {
          return {
            spoken: `Before you commit to either ${profile.comparisonA} or ${profile.comparisonB}, there is one critical difference you need to know.`,
            visual: `Split screen showing ${profile.comparisonA} icon vs ${profile.comparisonB} icon with bold question mark.`,
            reason: `Information gap prevents premature click-away by highlighting an overlooked decision factor.`,
          };
        }
        if (profile?.intent === 'explanation') {
          const cleanWhy = raw.replace(/^why (?:do |does |are |is )?/i, '').replace(/\?+$/, '').trim();
          return {
            spoken: `Have you ever wondered why ${cleanWhy.toLowerCase()}? The actual cause is rarely what people think.`,
            visual: `Dramatic zoom on unexpected anomaly on screen with high contrast caption.`,
            reason: `Direct validation of the viewer's curiosity establishes shared intrigue.`,
          };
        }
        if (profile?.intent === 'recommendation') {
          return {
            spoken: `Most ${profile.audience || 'people'} searching for ${subj.toLowerCase()} waste hours on tools that don't actually help.`,
            visual: `Cross mark over generic cluttered list turning into clean top 3 recommendations.`,
            reason: `Curiosity hook showing how to filter out low-value distractions.`,
          };
        }
        return {
          spoken: `If your ${subj.toLowerCase()} isn't where you want it to be, you might be overlooking this one crucial detail.`,
          visual: `Direct to camera address with analytics or workflow mistake highlighted in red.`,
          reason: `Pattern interrupt that challenges assumed knowledge within the first 5 seconds.`,
        };
      },
      problem: (t) => {
        const { act, subj } = resolveTopic(t);
        return {
          spoken: `If you are trying to ${act.toLowerCase()}, making this common mistake could cost you weeks of wasted effort.`,
          visual: `Split screen demonstrating the wrong, messy method versus the clean, effective approach.`,
          reason: `Loss aversion trigger: creators want to avoid wasted effort and preventable missteps.`,
        };
      },
      promise: (t) => {
        const { act } = resolveTopic(t);
        return {
          spoken: `In this video, you will learn a practical, realistic way to ${act.toLowerCase()} without unnecessary complexity.`,
          visual: `Fast 3-second preview of the finished result and clean actionable checklist.`,
          reason: `Clear value contract that sets expectation and encourages sustained watch time.`,
        };
      },
    },
    shortsSpoken: {
      hook: (t) => {
        const { profile, act } = resolveTopic(t);
        if (profile?.intent === 'comparison') {
          return `${profile.comparisonA} or ${profile.comparisonB}? Here is the honest answer in 30 seconds.`;
        }
        if (profile?.intent === 'explanation') {
          return `Ever wonder why this happens? Here is the real reason.`;
        }
        return `Trying to ${act.toLowerCase()}? Stop making this one rookie mistake!`;
      },
      setup: (t) => {
        const { subj } = resolveTopic(t);
        return `Most creators struggle with ${subj.toLowerCase()} because they focus on the wrong step first.`;
      },
      value: (t) => {
        const { act } = resolveTopic(t);
        return `Here is the shift: focus on ${act.toLowerCase()} first, then simplify everything else.`;
      },
      payoff: () => `Do this consistently, and you'll see a noticeable improvement in your videos.`,
      cta: `Follow for more practical creator breakdowns!`,
    },
    thumbnailTexts: ['STOP THIS', 'WHICH WINS?', 'IT WORKED?', 'NEVER DO THIS', '10X FASTER'],
    pinnedComment: {
      starter: `Question for the community 👇`,
      question: (t) => {
        const { gerund } = resolveTopic(t);
        return `What is the hardest part of ${gerund.toLowerCase()} for you right now — getting started, staying consistent, or seeing results?`;
      },
      cta: `Drop your thoughts below—replying to early comments can help start conversations with your audience!`,
    },
    description: {
      hookPrefix: `Looking to improve`,
      breakdownPrefix: `In this video, we break down practical, step-by-step methods and common pitfalls to avoid for`,
      cta: `🔔 Subscribe for more weekly actionable breakdowns and creator tutorials!`,
    },
    chapters: {
      intro: 'The Core Challenge',
      problem: 'Why Traditional Methods Struggle',
      breakdown: 'The Method Explained',
      stepByStep: 'Step-by-Step Walkthrough',
      mistakes: 'Common Mistakes to Avoid',
      conclusion: 'Key Takeaways & Summary',
    },
  },

  // 2. TAMIL (Natural Tamil Script)
  ta: {
    code: 'TA',
    name: 'Tamil',
    titleTemplates: {
      curiosity: (t) => {
        const { raw } = resolveTopic(t);
        return `யாரும் சொல்லாத ரகசியங்கள்: ${raw} (முழு விவரம்)`;
      },
      benefit: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} எளிதாக செய்வது எப்படி? முழு தமிழ் வழிகாட்டி`;
      },
      mistake: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} செய்யும்போது இந்த தப்பை மட்டும் பண்ணாதீங்க!`;
      },
      list: (t, c) => {
        const { raw } = resolveTopic(t);
        return `${c} முக்கியமான குறிப்புகள்: ${raw} (தமிழ்)`;
      },
      emotional: (t) => {
        const { raw } = resolveTopic(t);
        return `நான் இதை முயற்சித்தபோது நடந்த உண்மை: ${raw}`;
      },
    },
    hooks: {
      curiosity: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `${raw} பற்றி இதுவரை நீங்கள் கேள்விப்பட்டது எல்லாமே சரியா என்று யோசித்து பாருங்கள்.`,
          visual: `கேமராவுக்கு முன்னாடி தீவிர சிந்தனையுடன் விளக்கப் படத்தை காட்டும் காட்சி.`,
          reason: `பார்வையாளரின் கவனத்தை முதல் 5 விநாடிகளில் ஈர்க்கும் கேள்வி.`,
        };
      },
      problem: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `நீங்கள் ${raw} செய்யும்போது இந்த ஒரு பொதுவான தவறை செய்கிறீர்களா என்று பாருங்கள்.`,
          visual: `சிவப்பு நிற எச்சரிக்கை குறியீட்டுடன் திரையில் தவறை சுட்டிக்காட்டும் காட்சி.`,
          reason: `தவறுகளை தவிர்த்து நேரத்தை மிச்சப்படுத்த பார்வையாளர் விரும்புகிறார்.`,
        };
      },
      promise: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `இந்த வீடியோவில் ${raw} பற்றி மிக எளிமையான மற்றும் நேரடியான வழியை பார்க்கலாம்.`,
          visual: `நேரடி செயல்முறை விளக்கம் மற்றும் தெளிவான குறிப்புகள்.`,
          reason: `தெளிவான பலனை தருவதால் வீடியோவை முழுமையாக பார்க்க வைக்கிறது.`,
        };
      },
    },
    shortsSpoken: {
      hook: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} செய்யும்போது இந்த தப்பை மட்டும் பண்ணாதீங்க!`;
      },
      setup: () => `பலர் ஆரம்பத்தில் இந்த ஒரு விஷயத்தை கவனிக்காமல் நேரத்தை வீணடிக்கிறார்கள்.`,
      value: () => `இந்த எளிய வழிமுறையை பின்பற்றி உங்கள் வேலையை எளிதாக்குங்கள்.`,
      payoff: () => `இப்போது பாருங்கள், எவ்வளவு தெளிவான முடிவு கிடைக்கிறது என்று!`,
      cta: `மேலும் பயனுள்ள தகவல்களுக்கு இப்போதே சப்ஸ்கிரைப் செய்யுங்கள்!`,
    },
    thumbnailTexts: ['தவறு செய்யாதீங்க!', 'ரகசியம் இதுதான்', 'எப்படி செய்யணும்?', 'உண்மை என்ன?', '10X ரிசல்ட்'],
    pinnedComment: {
      starter: `நண்பர்களே உங்களுக்கான கேள்வி 👇`,
      question: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} செய்வதில் உங்களுக்கு இருக்கும் மிகப்பெரிய சவால் எது?`;
      },
      cta: `கீழே கமெண்ட்டில் சொல்லுங்கள், ஆரம்ப கருத்துகளுக்கு பதிலளிக்கிறேன்!`,
    },
    description: {
      hookPrefix: `வணக்கம் நண்பர்களே! இந்த வீடியோவில் நாம் விரிவாக பார்க்கப்போவது:`,
      breakdownPrefix: `படிப்படியான தமிழ் வழிகாட்டி மற்றும் முக்கியமான தவறுகளை தவிர்க்கும் முறைகள்:`,
      cta: `🔔 மேலும் பல பயனுள்ள வீடியோக்களுக்கு நமது சேனலுக்கு மறக்காமல் Subscribe செய்யுங்கள்!`,
    },
    chapters: {
      intro: 'அறிமுகம் & பின்னணி',
      problem: 'நாம் செய்யும் பொதுவான தவறு',
      breakdown: 'முக்கிய முறை விளக்கம்',
      stepByStep: 'படிப்படியான வழிமுறைகள்',
      mistakes: 'தவிர்க்க வேண்டியவை',
      conclusion: 'முடிவுரை & முக்கிய குறிப்புகள்',
    },
  },

  // 3. TANGLISH (Conversational Romanized Tamil)
  tanglish: {
    code: 'TA-ROM',
    name: 'Tanglish',
    titleTemplates: {
      curiosity: (t) => {
        const { raw } = resolveTopic(t);
        return `Yaarum Sollaadha Secrets: ${raw} (Kandippa Therinjukonga)`;
      },
      benefit: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} Easy-aa Panradhu Eppadi? Complete Tamil Guide`;
      },
      mistake: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} Panrappo Indha Mistake Mattum Pannadheenga!`;
      },
      list: (t, c) => {
        const { raw } = resolveTopic(t);
        return `${c} Important Tips: ${raw} Neenga Paakanum`;
      },
      emotional: (t) => {
        const { raw } = resolveTopic(t);
        return `Naan Try Panni Paathen... Unmai Enna-nu Theriyuma? (${raw})`;
      },
    },
    hooks: {
      curiosity: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `Ungalukku ${raw} pathi therinja ellame sariya nu oru vaati check pannunga.`,
          visual: `Creator reacting with curiosity as key point appears on screen.`,
          reason: `Conversational intrigue that instantly connects with younger vernacular audience.`,
        };
      },
      problem: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `Neenga ${raw} panrappo daily-aa indha mistake pandreengala-nu check pannunga.`,
          visual: `Split screen showing messy wrong technique vs sleek practical shortcut.`,
          reason: `Relatable mistake identification keeps viewer engaged.`,
        };
      },
      promise: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `Indha video-la ${raw} pathi romba simple-aa practical roadmap solli tharen.`,
          visual: `Quick 3-second preview of final output with upbeat audio.`,
          reason: `Clear and upfront value promise.`,
        };
      },
    },
    shortsSpoken: {
      hook: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} panradhula indha mistake mattum pannadheenga!`;
      },
      setup: () => `Neriya creators indha chinna vishayatha miss panni time waste pandraanga.`,
      value: () => `Indha simple step-ah follow pannunga, work romba easy aagidum.`,
      payoff: () => `Paathengala? Just simple steps-la semma results!`,
      cta: `Indha video useful-aa irundha like & subscribe pannidunga!`,
    },
    thumbnailTexts: ['IDHA PANNADHA!', 'SECRETS REVEALED', 'EPPADI?', 'UNMAI ENNA?', 'EASY TRICK'],
    pinnedComment: {
      starter: `Makkale oru chinna question 👇`,
      question: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} panrappo ungalukku entha vishayam romba tough-aa irukku?`;
      },
      cta: `Comment pannunga, early comments-ku naan direct-aa reply pandren!`,
    },
    description: {
      hookPrefix: `Vanakkam Makkale! Indha video-la namma practical-aa paaka poradhu:`,
      breakdownPrefix: `Conversational Tanglish step-by-step roadmap covering:`,
      cta: `🔔 Adutha super video miss pannaama irukka subscribe pannikonga!`,
    },
    chapters: {
      intro: 'Introduction & Overview',
      problem: 'Namma Panra Common Mistake',
      breakdown: 'The Working Method Explained',
      stepByStep: 'Step-by-Step Demo',
      mistakes: 'Idha Mattum Pannadheenga',
      conclusion: 'Summary & Key Advice',
    },
  },

  // 4. HINDI (Natural Devanagari)
  hi: {
    code: 'HI',
    name: 'Hindi',
    titleTemplates: {
      curiosity: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} का असली सच जो जानना जरूरी है! (Guide)`;
      },
      benefit: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} आसानी से कैसे करें? Step-by-Step Hindi Guide`;
      },
      mistake: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} करते समय यह 1 गलती कभी मत करना!`;
      },
      list: (t, c) => {
        const { raw } = resolveTopic(t);
        return `${raw} के लिए ${c} सबसे जरूरी टिप्स`;
      },
      emotional: (t) => {
        const { raw } = resolveTopic(t);
        return `मैंने ${raw} ट्राई किया और जो हुआ वो हैरान कर देगा!`;
      },
    },
    hooks: {
      curiosity: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `अगर आप ${raw} को लेकर परेशान हैं, तो यह बात ध्यान से सुनिए।`,
          visual: `स्क्रीन पर महत्वपूर्ण बिंदु की तरफ इशारा करते हुए टेक्स्ट हाईलाइट।`,
          reason: `दर्शकों की समस्या को सीधे संबोधित करके शुरुआत में रिटेंशन बढ़ाता है।`,
        };
      },
      problem: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `ज्यादातर लोग ${raw} में यह आम गलती करते हैं जिससे उनका काफी समय खराब होता है।`,
          visual: `गलत तरीके और सही तरीके का तुलनात्मक दृश्य।`,
          reason: `गलती सुधारने की स्वाभाविक इच्छा से दर्शक जुड़े रहते हैं।`,
        };
      },
      promise: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `इस वीडियो में हम ${raw} का एक बहुत ही आसान और व्यावहारिक तरीका सीखेंगे।`,
          visual: `मुख्य चरणों और उपयोगी परिणामों का त्वरित पूर्वावलोकन।`,
          reason: `सीखने का स्पष्ट वादा दर्शकों को पूरे वीडियो के लिए बांधता है।`,
        };
      },
    },
    shortsSpoken: {
      hook: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} करने में यह गलती बिल्कुल मत करना!`;
      },
      setup: () => `बहुत से लोग शुरुआत में बुनियादी बातों को नजरअंदाज कर देते हैं।`,
      value: () => `बस इस आसान तरीके को अपनाएं और अपने काम को व्यवस्थित करें।`,
      payoff: () => `अब देखिए परिणाम, कितना साफ और बेहतर आउटपुट मिलता है!`,
      cta: `ऐसी और उपयोगी टिप्स के लिए अभी सब्सक्राइब करें!`,
    },
    thumbnailTexts: ['यह मत करो!', 'असली सच', '10X तेज़', 'सीक्रेट ट्रिक', 'OMG! सच में?'],
    pinnedComment: {
      starter: `दोस्तों आपके लिए एक सवाल 👇`,
      question: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} में आपके लिए सबसे कठिन हिस्सा क्या है?`;
      },
      cta: `नीचे कमेंट में बताएं, शुरुआती कमेंट्स का रिप्लाई मैं खुद करूंगा!`,
    },
    description: {
      hookPrefix: `नमस्ते दोस्तों! इस वीडियो में हम विस्तार से चर्चा करेंगे:`,
      breakdownPrefix: `स्टेप-बाय-स्टेप ट्यूटोरियल जिसमें आप आसानी से सीखेंगे:`,
      cta: `🔔 ऐसी और उपयोगी वीडियो देखने के लिए चैनल को Subscribe जरूर करें!`,
    },
    chapters: {
      intro: 'शुरुआत और मुख्य बिंदु',
      problem: 'आम गलतियां क्यों होती हैं',
      breakdown: 'सही तरीका क्या है',
      stepByStep: 'स्टेप-बाय-स्टेप प्रक्रिया',
      mistakes: 'बचने योग्य गलतियां',
      conclusion: 'अंतिम सुझाव और निष्कर्ष',
    },
  },

  // 5. TELUGU
  te: {
    code: 'TE',
    name: 'Telugu',
    titleTemplates: {
      curiosity: (t) => {
        const { raw } = resolveTopic(t);
        return `ఎవరూ చెప్పని నిజాలు: ${raw} (తెలుగులో)`;
      },
      benefit: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} సులభంగా చేయడం ఎలా? Complete Telugu Guide`;
      },
      mistake: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} చేసేటప్పుడు ఈ తప్పు మాత్రం చేయకండి!`;
      },
      list: (t, c) => {
        const { raw } = resolveTopic(t);
        return `${raw} కోసం ${c} అద్భుతమైన టిప్స్`;
      },
      emotional: (t) => {
        const { raw } = resolveTopic(t);
        return `నేను ${raw} ట్రై చేసినప్పుడు అసలు నిజం తెలిసింది!`;
      },
    },
    hooks: {
      curiosity: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `${raw} గురించి మీరు తెలుసుకోవాల్సిన ముఖ్యమైన విషయం ఇది.`,
          visual: `హైలైట్ చేసిన ముఖ్యమైన పాయింట్ తో వీడియో ప్రారంభం.`,
          reason: `సమస్యను నేరుగా సంబోధించడం ద్వారా ఆసక్తిని పెంచుతుంది.`,
        };
      },
      problem: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `మీరు ${raw} చేసేటప్పుడు ఈ చిన్న తప్పు చేస్తున్నారా? ఒకసారి గమనించండి.`,
          visual: `సరైన మరియు తప్పు విధానాల స్ప్లిట్ స్క్రీన్ డిస్ప్లే.`,
          reason: `పొరపాట్లను సరిదిద్దుకోవాలనే ఆసక్తిని రేకెత్తిస్తుంది.`,
        };
      },
      promise: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `ఈ వీడియోలో ${raw} సులభంగా పూర్తి చేసే పద్ధతిని వివరంగా చూద్దాం.`,
          visual: `తుది ఫలితాల శీఘ్ర ప్రివ్యూ.`,
          reason: `స్పష్టమైన ఫలితంపై నమ్మకాన్ని పెంచుతుంది.`,
        };
      },
    },
    shortsSpoken: {
      hook: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} లో ఈ తప్పు చేయకండి!`;
      },
      setup: () => `చాలా మంది ఈ చిన్న ట్రిక్ తెలియక సమయం వృధా చేసుకుంటున్నారు.`,
      value: () => `ఈ సింపుల్ మెథడ్ ఫాలో అవ్వండి, చాలా సులభంగా అవుతుంది.`,
      payoff: () => `చూశారుగా, ఎంత అద్భుతంగా రిజల్ట్ వచ్చిందో!`,
      cta: `మరిన్ని టిప్స్ కోసం ఇప్పుడే సబ్‌స్క్రైబ్ చేసుకోండి!`,
    },
    thumbnailTexts: ['ఈ తప్పు వద్దు!', 'అసలు సీక్రెట్', 'ఎలా చేయాలి?', '10X ఫాస్ట్', 'నిజం ఇదే!'],
    pinnedComment: {
      starter: `మిత్రులారా మీకో ప్రశ్న 👇`,
      question: (t) => {
        const { raw } = resolveTopic(t);
        return `${raw} లో మీకు ఎదురయ్యే ప్రధాన సమస్య ఏమిటి?`;
      },
      cta: `కింద కామెంట్ చేయండి, ముఖ్యమైన కామెంట్స్ కి నేను రిప్లై ఇస్తాను!`,
    },
    description: {
      hookPrefix: `నమస్కారం! ఈ వీడియోలో మనం చూడబోయే అంశం:`,
      breakdownPrefix: `తెలుగులో సమగ్ర వివరణతో కూడిన ప్రాక్టికల్ గైడ్:`,
      cta: `🔔 మరిన్ని ఉపయోగకరమైన వీడియోల కోసం మా ఛానల్ ని సబ్‌స్క్రైబ్ చేయండి!`,
    },
    chapters: {
      intro: 'పరిచయం & సమస్య',
      problem: 'సాధారణ తప్పులు',
      breakdown: 'ప్రధాన పద్ధతి',
      stepByStep: 'స్టెప్-బై-స్టెప్ ప్రాసెస్',
      mistakes: 'చేయకూడని పనులు',
      conclusion: 'ముగింపు & టిప్స్',
    },
  },

  // 6. SPANISH
  es: {
    code: 'ES',
    name: 'Spanish',
    titleTemplates: {
      curiosity: (t) => {
        const { raw, noun } = resolveTopic(t);
        return `Lo Que Casi Nadie Te Cuenta Sobre: ${toTitleCase(noun)}`;
      },
      benefit: (t) => {
        const { raw, act } = resolveTopic(t);
        return `Cómo ${toTitleCase(act)} Paso a Paso (Guía Completa)`;
      },
      mistake: (t) => {
        const { raw, noun } = resolveTopic(t);
        return `Deja De Cometer Estos Errores En: ${toTitleCase(noun)}`;
      },
      list: (t, c) => {
        const { raw, noun } = resolveTopic(t);
        return `${c} Consejos Clave Para: ${toTitleCase(noun)}`;
      },
      emotional: (t) => {
        const { raw, noun } = resolveTopic(t);
        return `Probé De Todo En ${toTitleCase(noun)}... Esta Es La Realidad`;
      },
    },
    hooks: {
      curiosity: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `Si estás buscando mejorar en ${raw.toLowerCase()}, hay un detalle clave que casi todos pasan por alto.`,
          visual: `Corte dinámico mostrando el error común en pantalla con gráfico explicativo.`,
          reason: `Ruptura de patrón mental que genera curiosidad inmediata sin exagerar.`,
        };
      },
      problem: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `Cometer este error al intentar ${raw.toLowerCase()} te puede costar mucho tiempo y esfuerzo.`,
          visual: `Pantalla dividida con el método confuso frente a la solución limpia.`,
          reason: `Aversión a la pérdida y deseo de corregir errores habituales.`,
        };
      },
      promise: (t) => {
        const { raw } = resolveTopic(t);
        return {
          spoken: `En este video aprenderás un método práctico y realista para conseguir resultados claros.`,
          visual: `Montaje rápido de 3 segundos mostrando el flujo de trabajo organizado.`,
          reason: `Promesa de valor clara y alcanzable que retiene a la audiencia.`,
        };
      },
    },
    shortsSpoken: {
      hook: (t) => {
        const { raw } = resolveTopic(t);
        return `¡Evita este error al hacer ${raw.toLowerCase()}!`;
      },
      setup: () => `Muchos creadores pierden tiempo porque complican el primer paso.`,
      value: () => `Aplica este ajuste directo y verás cómo todo fluye mucho mejor.`,
      payoff: () => `¡Mira la diferencia, resultado limpio y profesional!`,
      cta: `¡Suscríbete para más consejos prácticos cada semana!`,
    },
    thumbnailTexts: ['¡NO HAGAS ESTO!', 'EL SECRETO', '10X MÁS RÁPIDO', '¿FUNCIONA?', 'ERROR TOTAL'],
    pinnedComment: {
      starter: `Pregunta para la comunidad 👇`,
      question: (t) => {
        const { raw } = resolveTopic(t);
        return `¿Qué es lo más difícil para ti al trabajar en ${raw.toLowerCase()}?`;
      },
      cta: `¡Deja tu comentario abajo, respondiendo a los primeros comentarios!`,
    },
    description: {
      hookPrefix: `¿Quieres mejorar tu flujo de trabajo en:`,
      breakdownPrefix: `En este video te explicamos paso a paso métodos prácticos y errores a evitar:`,
      cta: `🔔 ¡Suscríbete al canal para no perderte las próximas lecciones semanales!`,
    },
    chapters: {
      intro: 'El Problema Principal',
      problem: 'Por Qué Falla Lo Habitual',
      breakdown: 'El Método Práctico',
      stepByStep: 'Guía Paso a Paso',
      mistakes: 'Errores a Evitar',
      conclusion: 'Conclusiones y Consejos',
    },
  },
};

// Generic fallback handler for remaining languages
export function getLanguagePack(langCodeOrName: string): LanguagePack {
  const norm = langCodeOrName.toLowerCase();

  if (norm === 'ta' || norm.includes('tamil')) return LANGUAGE_DICTIONARY.ta;
  if (norm === 'tanglish' || norm.includes('tanglish')) return LANGUAGE_DICTIONARY.tanglish;
  if (norm === 'hi' || norm.includes('hindi')) return LANGUAGE_DICTIONARY.hi;
  if (norm === 'te' || norm.includes('telugu')) return LANGUAGE_DICTIONARY.te;
  if (norm === 'es' || norm.includes('spanish')) return LANGUAGE_DICTIONARY.es;

  // Localized title prefix descriptors for global languages
  const localizedPrefixes: Record<string, { secret: string; howto: string; stop: string; tips: string; truth: string }> = {
    ml: { secret: 'പ്രധാന രഹസ്യങ്ങൾ', howto: 'എളുപ്പത്തിൽ ചെയ്യാം', stop: 'ഈ തെറ്റ് ചെയ്യരുത്', tips: 'പ്രധാന നുറുങ്ങുകൾ', truth: 'യഥാർത്ഥ വസ്തുത' },
    kn: { secret: 'ಮುಖ್ಯ ರಹಸ್ಯಗಳು', howto: 'ಸುಲಭವಾಗಿ ಮಾಡುವುದು ಹೇಗೆ', stop: 'ಈ ತಪ್ಪು ಮಾಡಬೇಡಿ', tips: 'ಮುಖ್ಯ ಸಲಹೆಗಳು', truth: 'ನಿಜವಾದ ಸತ್ಯ' },
    bn: { secret: 'জরুরি তথ্য', howto: 'সহজ পদ্ধতি টিউটোরিয়াল', stop: 'এই ভুলটি করবেন না', tips: 'গুরুত্বপূর্ণ টিপস', truth: 'আসল সত্য' },
    mr: { secret: 'महत्त्वाचे रहस्य', howto: 'कसे करावे सोपी पद्धत', stop: 'ही चूक करू नका', tips: 'महत्त्वाच्या टिप्स', truth: 'खरे सत्य' },
    gu: { secret: 'મહત્વપૂર્ણ સિક્રેટ્સ', howto: 'કેવી રીતે સરળતાથી કરવું', stop: 'આ ભૂલ ક્યારેય ના કરો', tips: 'મહત્વપૂર્ણ ટિપ્સ', truth: 'વાસ્તવિક સત્ય' },
    pa: { secret: 'ਜ਼ਰੂਰੀ ਰਾਜ਼', howto: 'ਆਸਾਨੀ ਨਾਲ ਕਿਵੇਂ ਕਰੀਏ', stop: 'ਇਹ ਗਲਤੀ ਨਾ ਕਰੋ', tips: 'ਜ਼ਰੂਰੀ ਸੁਝਾਅ', truth: 'ਅਸਲ ਸੱਚਾਈ' },
    ur: { secret: 'اہم معلومات', howto: 'آسان طریقہ اردو میں', stop: 'یہ غلطی مت کریں', tips: 'اہم ٹپس', truth: 'حقیقت کیا ہے' },
    fr: { secret: 'Ce Qu’Il Faut Savoir Sur', howto: 'Comment Réussir', stop: 'Évitez Ces Erreurs Dans', tips: 'Conseils Pratiques Pour', truth: 'La Réalité Sur' },
    de: { secret: 'Was Wichtig Ist Über', howto: 'Wie Man Meistert', stop: 'Häufige Fehler Bei', tips: 'Wichtige Tipps Für', truth: 'Die Wahrheit Über' },
    it: { secret: 'Quello Che Devi Sapere Su', howto: 'Come Fare', stop: 'Errori Da Evitare In', tips: 'Consigli Utili Per', truth: 'La Verità Su' },
    pt: { secret: 'O Que Saber Sobre', howto: 'Como Fazer', stop: 'Erros Comuns Em', tips: 'Dicas Essenciais Para', truth: 'A Realidade Sobre' },
    ja: { secret: '知っておくべきポイント', howto: '初心者向け実践ガイド', stop: '避けるべきNG行動', tips: '実践的なコツ', truth: '実際の検証結果' },
    ko: { secret: '꼭 알아야 할 핵심 포인트', howto: '가장 쉽게 실천하는 법', stop: '주의해야 할 실수', tips: '핵심 실전 팁', truth: '직접 테스트해 본 결과' },
    zh: { secret: '核心实操技巧', howto: '保姆级实操指南', stop: '常见误区与避坑指南', tips: '高阶实用技巧', truth: '真实测评与复盘' },
    ar: { secret: 'حقائق هامة حول', howto: 'دليل عملي لـ', stop: 'أخطاء شائعة في', tips: 'نصائح هامة حول', truth: 'الحقيقة حول' },
  };

  const fullNameToCode: Record<string, string> = {
    malayalam: 'ml',
    kannada: 'kn',
    bengali: 'bn',
    marathi: 'mr',
    gujarati: 'gu',
    punjabi: 'pa',
    urdu: 'ur',
    french: 'fr',
    german: 'de',
    italian: 'it',
    portuguese: 'pt',
    japanese: 'ja',
    korean: 'ko',
    chinese: 'zh',
    mandarin: 'zh',
    arabic: 'ar',
  };

  const matchedAliasKey = Object.keys(fullNameToCode).find((alias) => norm.includes(alias));
  const matched =
    (matchedAliasKey ? fullNameToCode[matchedAliasKey] : undefined) ||
    Object.keys(localizedPrefixes).find((k) => norm === k || norm.startsWith(`${k}-`) || norm.startsWith(`${k} `));
  if (matched) {
    const loc = localizedPrefixes[matched];
    return {
      code: matched.toUpperCase(),
      name: langCodeOrName,
      titleTemplates: {
        curiosity: (t) => {
          const { raw, noun } = resolveTopic(t);
          return `${loc.secret}: ${toTitleCase(noun || raw)}`;
        },
        benefit: (t) => {
          const { raw, act } = resolveTopic(t);
          return `${loc.howto} - ${toTitleCase(act || raw)}`;
        },
        mistake: (t) => {
          const { raw, noun } = resolveTopic(t);
          return `${loc.stop} (${toTitleCase(noun || raw)})`;
        },
        list: (t, c) => {
          const { raw, noun } = resolveTopic(t);
          return `${c} ${loc.tips}: ${toTitleCase(noun || raw)}`;
        },
        emotional: (t) => {
          const { raw, noun } = resolveTopic(t);
          return `${loc.truth}: ${toTitleCase(noun || raw)}`;
        },
      },
      hooks: {
        curiosity: (t) => {
          const { raw } = resolveTopic(t);
          return {
            spoken: `If you want to improve your approach to ${raw.toLowerCase()}, here is an important factor to consider.`,
            visual: `Clear, high-contrast demonstration of key technique.`,
            reason: `Direct, credible opening statement establishing relevance.`,
          };
        },
        problem: (t) => {
          const { raw } = resolveTopic(t);
          return {
            spoken: `Making this simple oversight in ${raw.toLowerCase()} can set your progress back.`,
            visual: `Comparison showing confusing workflow versus streamlined execution.`,
            reason: `Identifies a painful bottleneck and introduces an achievable solution.`,
          };
        },
        promise: (t) => {
          const { raw } = resolveTopic(t);
          return {
            spoken: `In this guide, you will discover a straightforward, actionable method to achieve results.`,
            visual: `Overview of the step-by-step checklist.`,
            reason: `Sets honest expectations and provides clear structure.`,
          };
        },
      },
      shortsSpoken: {
        hook: (t) => {
          const { raw } = resolveTopic(t);
          return `Avoid this common mistake with ${raw.toLowerCase()}!`;
        },
        setup: () => `Most creators complicate their workflow by skipping the basics.`,
        value: () => `Focus on the main step first, then streamline the rest.`,
        payoff: () => `Notice how much cleaner and more consistent your videos become.`,
        cta: `Subscribe for more practical creator tutorials!`,
      },
      thumbnailTexts: ['STOP THIS', 'KEY TIPS', '10X FASTER', 'TRY THIS', 'HOW TO'],
      pinnedComment: {
        starter: `Community question 👇`,
        question: (t) => {
          const { raw } = resolveTopic(t);
          return `What is your biggest obstacle when working on ${raw.toLowerCase()}?`;
        },
        cta: `Share your thoughts below—replying to comments helps start conversations with your viewers!`,
      },
      description: {
        hookPrefix: `A practical breakdown covering`,
        breakdownPrefix: `Step-by-step tutorial and practical techniques for`,
        cta: `🔔 Subscribe for more high-value creator guides every week!`,
      },
      chapters: {
        intro: 'Introduction & Overview',
        problem: 'The Core Challenge',
        breakdown: 'The Method Explained',
        stepByStep: 'Step-by-Step Walkthrough',
        mistakes: 'Common Pitfalls to Avoid',
        conclusion: 'Key Takeaways & Summary',
      },
    };
  }

  // Default English
  return LANGUAGE_DICTIONARY.en;
}
