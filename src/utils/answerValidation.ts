/**
 * Checks if a user's answer (label) is correct against various database storage formats.
 * Handles:
 * 1. Label match (A === A)
 * 2. Index match (0 === 0)
 * 3. Text match (Option Text === Correct Answer Text)
 */
export const checkIsCorrect = (correctAnswer: string | null, userAnswerLabel: string, options: string[] | null): boolean => {
    if (!correctAnswer || !userAnswerLabel) return false;

    const correct = String(correctAnswer).trim().toLowerCase();
    const userLabel = String(userAnswerLabel).trim().toLowerCase();

    // 1. Direct Label Match (e.g. "a" === "a")
    if (userLabel === correct) return true;

    // We need to resolve the user's label to an index to check Index/Text matches
    const labels = ['a', 'b', 'c', 'd', 'e'];
    const userIndex = labels.findIndex(l => l === userLabel);

    if (userIndex !== -1) {
        // 2. Index Match (e.g. "0" === "0")
        // We only check 0-based index to avoid ambiguity with Option labels
        if (String(userIndex) === correct) return true;

        // 3. Option Text Match
        if (options && options[userIndex]) {
            const userText = String(options[userIndex]).trim().toLowerCase();
            if (userText === correct) return true;
        }
    }

    return false;
};
