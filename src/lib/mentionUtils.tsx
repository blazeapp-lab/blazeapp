import { Link } from "react-router-dom";

// HTML entity escape function to prevent XSS
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const parseMentions = (content: string | null | undefined) => {
  // Handle null/undefined/empty content
  if (!content || typeof content !== 'string') {
    return [''];
  }

  try {
    // Sanitize content first to prevent XSS
    const sanitizedContent = escapeHtml(content.trim());
    
    // Additional safety check after sanitization
    if (!sanitizedContent) {
      return [''];
    }
    
    const mentionRegex = /@(\w+)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(sanitizedContent)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(sanitizedContent.substring(lastIndex, match.index));
      }

      // Add mention as link - username is already sanitized
      const username = match[1];
      parts.push(
        <Link
          key={`mention-${match.index}`}
          to={`/profile/${username}`}
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          @{username}
        </Link>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < sanitizedContent.length) {
      parts.push(sanitizedContent.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [sanitizedContent];
  } catch (error) {
    console.error('Error parsing mentions:', error);
    return ['[Content unavailable]'];
  }
};
