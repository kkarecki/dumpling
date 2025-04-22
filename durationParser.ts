export function parseDuration(durationStr: string): number | null {
    const regex = /(\d+)([dhms])/gi;
    let totalMilliseconds = 0;
    let match;
    let foundMatch = false;

    // Pętla znajduje kolejne dopasowania (np. dla "1d6h" znajdzie "1d" a potem "6h")
    while ((match = regex.exec(durationStr)) !== null) {
        foundMatch = true;
        // ----- POPRAWKA TUTAJ -----
        // Dodajemy '!', aby zapewnić TypeScript, że match[1] i match[2]
        // na pewno istnieją i są stringami, skoro match nie jest null.
        const value = parseInt(match[1]!, 10);
        const unit = match[2]!.toLowerCase();
        // --------------------------

        switch (unit) {
            case 'd':
                totalMilliseconds += value * 24 * 60 * 60 * 1000;
                break;
            case 'h':
                totalMilliseconds += value * 60 * 60 * 1000;
                break;
            case 'm':
                totalMilliseconds += value * 60 * 1000;
                break;
            case 's':
                totalMilliseconds += value * 1000;
                break;
            default:
                return null; // Nie powinno się zdarzyć przy tym regexie
        }
    }

    // Dodatkowa walidacja, aby upewnić się, że *cały* string pasował
    const validationRegex = /^((\d+[dhms])+)$/i;
    if (!foundMatch || !validationRegex.test(durationStr)) {
        return null;
    }


    return totalMilliseconds > 0 ? totalMilliseconds : null;
}

/**
 * Formats milliseconds into a human-readable string (e.g., "1d 6h 30m").
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;

    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    hours %= 24;
    minutes %= 60;
    seconds %= 60;

    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (seconds > 0) result += `${seconds}s`;

    return result.trim();
}