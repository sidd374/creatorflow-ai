/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Authentic Tamil Language Pipeline (தமிழ்)
 * Generates natural, grammatically correct Tamil creator content in pure Tamil Unicode script.
 * Preserves foreign technical terms while enforcing natural Tamil syntax and discourse structure.
 */

import { CreativeStrategyType } from '../types';
import { StructuredTopicUnderstanding } from '../topicUnderstanding';

export function formatTamilTitle(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType,
  seed: number = 0
): string {
  const { subjectNoun, comparisons } = understanding;

  switch (strategy) {
    case 'curiosity_mystery': {
      const patterns = [
        `${subjectNoun} பற்றி யாரும் சொல்லாத உண்மைகள் (தெரிந்து கொள்ளுங்கள்)`,
        `${subjectNoun}-ல் வெற்றி பெற உண்மையான ரகசியம் என்ன?`,
        `${subjectNoun} பற்றிய இந்த விஷயம் உங்களுக்கு தெரியுமா?`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'problem_solution': {
      const patterns = [
        `${subjectNoun}-ல் இந்த தவறை ஒருபோதும் செய்யாதீர்கள் (எளிய தீர்வு)`,
        `${subjectNoun} பிரச்சனையை சரிசெய்ய 3 சுலபமான வழிகள்`,
        `${subjectNoun} செய்வதற்கு முன் இதை கண்டிப்பாக கவனியுங்கள்`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'unexpected_contrast': {
      if (comparisons) {
        return `${comparisons.itemA} vs ${comparisons.itemB}: எது சிறந்தது? (உண்மை ஒப்பீடு)`;
      }
      const patterns = [
        `${subjectNoun}: மக்கள் நினைப்பதும், நிஜத்தில் நடப்பதும்!`,
        `${subjectNoun} பற்றிய பெரிய தவறான கருத்துக்கள்`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'storytelling_case_study': {
      const patterns = [
        `நான் எப்படி ${subjectNoun}-ல் வெற்றி அடைந்தேன்? (முழு அனுபவம்)`,
        `${subjectNoun}: பூஜ்யத்திலிருந்து தொடக்கம் வரை என் பயணம்`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'myth_vs_fact': {
      const patterns = [
        `${subjectNoun} பற்றிய 5 தவறான எண்ணங்கள் (உண்மைகள் இதோ)`,
        `${subjectNoun} பற்றிய உண்மை என்ன? ஆராய்ந்து பார்ப்போம்`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'practical_tutorial':
    default: {
      const patterns = [
        `${subjectNoun} செய்வது எப்படி? (ஆரம்பம் முதல் இறுதி வரை முழு வழிகாட்டி)`,
        `${subjectNoun} பற்றி தமிழில் எளிய முறையில் கற்றுக்கொள்ளுங்கள்`,
        `${subjectNoun} - 10 நிமிடத்தில் சுலபமாக கற்றுக்கொள்ளலாம்`,
      ];
      return patterns[seed % patterns.length];
    }
  }
}

export function formatTamilHook(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType,
  seed: number = 0
): { spokenHook: string; visualDirection: string; retentionTrigger: string; deliveryTip: string } {
  const { subjectNoun } = understanding;

  switch (strategy) {
    case 'curiosity_mystery':
      return {
        spokenHook: `நீங்க ${subjectNoun} பத்தி இதுவரைக்கும் கேட்ட விஷயங்கள்ல 90% தப்பு! உண்மையான ரகசியம் என்னனு இந்த வீடியோல பாக்கலாம்.`,
        visualDirection: `கண்களை நேராகப் பார்த்து பேசுங்கள், 3-வது வினாடியில் வேகமான ஜூம் (Zoom-in), வியப்பூட்டும் கிராபிக்ஸ்.`,
        retentionTrigger: 'ஆர்வம் மற்றும் அறியும் ஆர்வம் தூண்டுதல் (Curiosity Loop).',
        deliveryTip: 'தெளிவாகவும், புன்னகையுடனும், வேகத்தைக் கட்டுப்படுத்தியும் பேசுங்கள்.',
      };

    case 'problem_solution':
      return {
        spokenHook: `${subjectNoun} செய்யும்போது நீங்க இந்த ஒரு தப்பை பண்றீங்களா? அப்போ உங்க நேரம் வீணாகிட்டு இருக்கு!`,
        visualDirection: `திரையில் சிவப்பு நிற தவறு குறி (Cross mark), பின்னர் உடனே பச்சை நிற தீர்வு காட்சி.`,
        retentionTrigger: 'தவறைத் தவிர்க்கும் எச்சரிக்கை உணர்வு (Pain Point Relief).',
        deliveryTip: 'முதல் வார்த்தையிலேயே அழுத்தமான குரலில் எச்சரிக்கையாகத் தொடங்குங்கள்.',
      };

    case 'practical_tutorial':
    default:
      return {
        spokenHook: `இன்னிக்கு வீடியோல ${subjectNoun} ரொம்ப சுலபமா, நேரத்தை வீணடிக்காம எப்படி செய்யறதுனு முழுசா பாக்கப்போறோம்!`,
        visualDirection: `செயல்முறை முடிவு திரையில் தோன்றுவது போன்ற B-Roll மற்றும் ஸ்கிரீன் ரெக்கார்டிங்.`,
        retentionTrigger: 'தெளிவான பயன் தரும் வாக்குறுதி (Direct Value Proposition).',
        deliveryTip: 'நேரடியாகப் பேசத் தொடங்குங்கள், தேவையில்லாத அறிமுகங்களைத் தவிருங்கள்.',
      };
  }
}
