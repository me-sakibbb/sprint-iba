// Vocabulary data for VocabPoly game

export interface VocabWord {
    word: string;
    definition: string;
    difficulty: "easy" | "medium" | "hard";
    example?: string;
}

const vocabularyWords: VocabWord[] = [
    // Easy words
    {
        word: "Abundant",
        definition: "Existing or available in large quantities; plentiful",
        difficulty: "easy",
        example: "The garden had abundant flowers in spring."
    },
    {
        word: "Benevolent",
        definition: "Well-meaning and kindly",
        difficulty: "easy",
        example: "The benevolent king cared for his people."
    },
    {
        word: "Cautious",
        definition: "Careful to avoid potential problems or dangers",
        difficulty: "easy",
        example: "She was cautious when crossing the busy street."
    },
    {
        word: "Diligent",
        definition: "Having or showing care and conscientiousness in one's work or duties",
        difficulty: "easy",
        example: "His diligent study habits led to excellent grades."
    },
    {
        word: "Elated",
        definition: "Very happy and excited",
        difficulty: "easy",
        example: "She was elated to win the competition."
    },
    {
        word: "Frugal",
        definition: "Sparing or economical with regard to money or food",
        difficulty: "easy",
        example: "Her frugal lifestyle helped her save money."
    },
    {
        word: "Genuine",
        definition: "Truly what something is said to be; authentic",
        difficulty: "easy",
        example: "Her concern for others was genuine."
    },
    {
        word: "Humble",
        definition: "Having or showing a modest or low estimate of one's own importance",
        difficulty: "easy",
        example: "Despite his success, he remained humble."
    },

    // Medium words
    {
        word: "Ambiguous",
        definition: "Open to more than one interpretation; not having one obvious meaning",
        difficulty: "medium",
        example: "The instructions were so ambiguous that no one understood them."
    },
    {
        word: "Candid",
        definition: "Truthful and straightforward; frank",
        difficulty: "medium",
        example: "She gave a candid account of her experiences."
    },
    {
        word: "Eloquent",
        definition: "Fluent or persuasive in speaking or writing",
        difficulty: "medium",
        example: "His eloquent speech moved the audience to tears."
    },
    {
        word: "Hackneyed",
        definition: "Lacking significance through overuse; unoriginal and trite",
        difficulty: "medium",
        example: "The writer avoided hackneyed phrases in her novel."
    },
    {
        word: "Meticulous",
        definition: "Very attentive to detail; meticulous; careful",
        difficulty: "medium",
        example: "She was meticulous in her research."
    },
    {
        word: "Nostalgia",
        definition: "A sentimental longing for the past",
        difficulty: "medium",
        example: "Looking at old photographs filled him with nostalgia."
    },
    {
        word: "Pragmatic",
        definition: "Dealing with things sensibly and realistically",
        difficulty: "medium",
        example: "She took a pragmatic approach to problem-solving."
    },
    {
        word: "Resilient",
        definition: "Able to withstand or recover quickly from difficult conditions",
        difficulty: "medium",
        example: "The resilient community rebuilt after the disaster."
    },

    // Hard words
    {
        word: "Ephemeral",
        definition: "Lasting for a very short time",
        difficulty: "hard",
        example: "The beauty of cherry blossoms is ephemeral."
    },
    {
        word: "Juxtapose",
        definition: "Place or deal with close together for contrasting effect",
        difficulty: "hard",
        example: "The artist juxtaposed modern and classical elements."
    },
    {
        word: "Loquacious",
        definition: "Tending to talk a great deal; talkative",
        difficulty: "hard",
        example: "The loquacious guest dominated the conversation."
    },
    {
        word: "Obfuscate",
        definition: "Make obscure or unclear; bewilder",
        difficulty: "hard",
        example: "The politician tried to obfuscate the issue."
    },
    {
        word: "Pernicious",
        definition: "Having a harmful effect, especially in a gradual or subtle way",
        difficulty: "hard",
        example: "The pernicious influence of corruption spread throughout the organization."
    },
    {
        word: "Quintessential",
        definition: "Representing the most perfect or typical example of a quality or class",
        difficulty: "hard",
        example: "She was the quintessential professional."
    },
    {
        word: "Ubiquitous",
        definition: "Present, appearing, or found everywhere",
        difficulty: "hard",
        example: "Smartphones have become ubiquitous in modern society."
    },
    {
        word: "Zenith",
        definition: "The time at which something is most powerful or successful",
        difficulty: "hard",
        example: "The empire reached its zenith during the 19th century."
    },

    // Additional words for variety
    {
        word: "Alleviate",
        definition: "Make suffering, deficiency, or a problem less severe",
        difficulty: "easy",
        example: "The medicine helped alleviate her pain."
    },
    {
        word: "Brevity",
        definition: "Concise and exact use of words; briefness",
        difficulty: "medium",
        example: "The speaker was known for her brevity."
    },
    {
        word: "Debilitate",
        definition: "Make someone weak and infirm",
        difficulty: "hard",
        example: "The illness debilitated him for months."
    },
    {
        word: "Enumerate",
        definition: "Mention a number of things one by one",
        difficulty: "medium",
        example: "She enumerated the reasons for her decision."
    },
    {
        word: "Formidable",
        definition: "Inspiring fear or respect through being impressively large or powerful",
        difficulty: "medium",
        example: "They face a formidable challenge."
    },
    {
        word: "Gregarious",
        definition: "Fond of company; sociable",
        difficulty: "medium",
        example: "He was a gregarious person who loved parties."
    },
];

export function getRandomWords(count: number, difficulty?: "easy" | "medium" | "hard"): VocabWord[] {
    let filteredWords = vocabularyWords;

    if (difficulty) {
        filteredWords = vocabularyWords.filter(w => w.difficulty === difficulty);
    }

    // Shuffle and return
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

export function getWrongDefinitions(word: VocabWord, count: number): string[] {
    const otherWords = vocabularyWords.filter(w => w.word !== word.word);
    const shuffled = otherWords.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(w => w.definition);
}
