/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Authentic Hindi Pipeline (हिंदी)
 * Generates natural Hindi YouTube creator content in Devanagari script.
 * Preserves foreign names and technical nouns cleanly.
 */

import { CreativeStrategyType } from '../types';
import { StructuredTopicUnderstanding } from '../topicUnderstanding';

export function formatHindiTitle(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType,
  seed: number = 0
): string {
  const { subjectNoun, comparisons } = understanding;

  switch (strategy) {
    case 'curiosity_mystery': {
      const patterns = [
        `${subjectNoun} का कड़वा सच जो कोई नहीं बताता!`,
        `${subjectNoun} के बारे में यह गुप्त बात क्या आपको पता है?`,
        `${subjectNoun} में सफलता पाने का असली राज जानिए!`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'problem_solution': {
      const patterns = [
        `${subjectNoun} करते समय यह गलती बिल्कुल मत करना!`,
        `${subjectNoun} की परेशानी को दूर करने के 3 आसान तरीके`,
        `अगर आप ${subjectNoun} में अटके हैं तो यह वीडियो पहले देखें`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'unexpected_contrast': {
      if (comparisons) {
        return `${comparisons.itemA} vs ${comparisons.itemB}: कौन सा सबसे अच्छा है? (सच्चाई जानिए)`;
      }
      const patterns = [
        `${subjectNoun}: जो आपको बताया जाता है vs जो सच में काम करता है!`,
        `${subjectNoun} के बारे में सबसे बड़ा झूठ!`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'storytelling_case_study': {
      const patterns = [
        `मैंने ${subjectNoun} में शून्य से शुरुआत करके कैसे सफलता पाई?`,
        `${subjectNoun}: 30 दिनों का मेरा असली अनुभव और नतीजे`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'myth_vs_fact': {
      const patterns = [
        `${subjectNoun} को लेकर 5 बड़े भ्रम और उनकी सच्चाई!`,
        `${subjectNoun} की हकीकत क्या है? पूरा सच जानिए`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'practical_tutorial':
    default: {
      const patterns = [
        `${subjectNoun} कैसे करें? (शुरुआत से अंत तक पूरा गाइड हिंदी में)`,
        `${subjectNoun} सिर्फ 10 मिनट में आसानी से सीखें`,
        `${subjectNoun} सीखने का सबसे आसान तरीका 2026`,
      ];
      return patterns[seed % patterns.length];
    }
  }
}

export function formatHindiHook(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType,
  seed: number = 0
): { spokenHook: string; visualDirection: string; retentionTrigger: string; deliveryTip: string } {
  const { subjectNoun } = understanding;

  switch (strategy) {
    case 'curiosity_mystery':
      return {
        spokenHook: `अगर आप सोचते हैं कि ${subjectNoun} सिर्फ घंटों मेहनत करने से हो जाएगा, तो अगले 60 सेकंड आपकी सोच हमेशा के लिए बदल देंगे!`,
        visualDirection: `कैमरे की तरफ सीधे देखते हुए, 2.5 सेकंड पर स्नैप ज़ूम, बैकग्राउंड में रहस्यमयी फुटेज।`,
        retentionTrigger: 'जिज्ञासा लूप और उत्सुकता ट्रिगर (Information Gap).',
        deliveryTip: 'शांत और आत्मविश्वास से भरी आवाज़ में बात करें।',
      };

    case 'problem_solution':
      return {
        spokenHook: `${subjectNoun} में यह एक गलती आपका हफ्तों का समय और मेहनत पूरी तरह बर्बाद कर रही है!`,
        visualDirection: `स्क्रीन पर बड़ा लाल क्रॉस (X), फिर तुरंत सही समाधान की हरी टिक मार्क क्लिप।`,
        retentionTrigger: 'नुकसान से बचने की तात्कालिकता (Mistake Avoidance).',
        deliveryTip: 'मजबूत और सतर्क आवाज़ में शुरुआत करें, समाधान से पहले थोड़ा विराम लें।',
      };

    case 'practical_tutorial':
    default:
      return {
        spokenHook: `आज के वीडियो में हम ${subjectNoun} को बिल्कुल आसान तरीके से, बिना किसी फालतू बात के स्टेप-बाय-स्टेप सीखने वाले हैं!`,
        visualDirection: `तैयार रिजल्ट की 2 सेकंड की तेज क्लिप, फिर तुरंत स्टेप 1 की स्क्रीन रिकॉर्डिंग।`,
        retentionTrigger: 'स्पष्ट और ठोस परिणाम का वादा (Direct Value Proposition).',
        deliveryTip: 'सकारात्मक ऊर्जा, बिना देरी सीधे मुख्य विषय पर आएं।',
      };
  }
}
