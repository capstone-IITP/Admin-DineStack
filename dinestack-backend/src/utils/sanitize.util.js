/**
 * Strip HTML tags from a string. Use ONLY on fields rendered to end users:
 *   - descriptions, notes, public-facing text
 * Do NOT apply to: IDs, UUIDs, codes, emails, tokens, names
 */
function stripHtmlTags(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/<[^>]*>/g, '').trim();
}

module.exports = { stripHtmlTags };
