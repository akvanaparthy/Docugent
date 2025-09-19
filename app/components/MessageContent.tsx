import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import parse from "html-react-parser";

interface MessageContentProps {
  content: string;
  isUser?: boolean;
}

export function MessageContent({
  content,
  isUser = false,
}: MessageContentProps) {
  // Check if content contains <thinking> and/or <response> tags
  const hasThinking = content.includes("<thinking>");
  const hasResponse = content.includes("<response>");

  if (hasThinking || hasResponse) {
    // Parse thinking and response sections
    const thinkingMatch = content.match(/<thinking>(.*?)<\/thinking>/s);
    const responseMatch = content.match(/<response>(.*?)<\/response>/s);

    // Handle case where response tag is not properly closed
    const responseMatchUnclosed = content.match(/<response>(.*?)$/s);

    const thinkingContent = thinkingMatch ? thinkingMatch[1].trim() : "";
    let responseContent = responseMatch
      ? responseMatch[1].trim()
      : responseMatchUnclosed
      ? responseMatchUnclosed[1].trim()
      : "";

    // If response tag exists but has no content (like "<response>"),
    // extract everything before the response tag
    if (hasResponse && !responseContent) {
      const beforeResponse = content.split("<response>")[0].trim();
      if (beforeResponse) {
        responseContent = beforeResponse;
      }
    }

    // If we still don't have response content but there's a response tag,
    // it might be that the model just added <response> at the end
    // In this case, treat everything before <response> as the response
    if (hasResponse && !responseContent && !thinkingContent) {
      const beforeResponse = content.split("<response>")[0].trim();
      if (beforeResponse) {
        responseContent = beforeResponse;
      } else {
        responseContent = content;
      }
    }

    // If we have response content but no thinking content, just show the response
    if (responseContent && !thinkingContent) {
      return (
        <div
          className={`prose prose-sm max-w-none ${
            isUser ? "prose-invert" : ""
          }`}
        >
          {parse(responseContent)}
        </div>
      );
    }

    // If we have thinking content but no response content, show thinking
    if (thinkingContent && !responseContent) {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500 p-4 rounded-r-lg">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
              💭 Thinking Process:
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              {parse(thinkingContent)}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {thinkingContent && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500 p-4 rounded-r-lg">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
              💭 Thinking Process:
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              {parse(thinkingContent)}
            </div>
          </div>
        )}

        {responseContent && (
          <div
            className={`prose prose-sm max-w-none ${
              isUser ? "prose-invert" : ""
            }`}
          >
            {parse(responseContent)}
          </div>
        )}
      </div>
    );
  }

  // Clean up the content - replace escaped newlines with actual newlines
  let cleanedContent = content.replace(/\\n/g, "\n");

  // Remove incomplete code blocks (triple backticks without proper closing)
  cleanedContent = cleanedContent
    .replace(/```\s*$/, "") // Remove trailing ```
    .replace(/```\s*\n$/, "") // Remove trailing ``` with newline
    .replace(/```\s*$/, "") // Remove any remaining trailing ```
    .trim(); // Remove any trailing whitespace

  // Convert URLs in backticks to proper markdown links
  // This handles cases like `https://github.com/` -> [https://github.com/](https://github.com/)
  cleanedContent = cleanedContent.replace(
    /`(https?:\/\/[^\s`]+)`/g,
    "[$1]($1)"
  );

  // If no special tags, check if it contains actual HTML tags (not markdown)
  // Look for proper HTML tags, not just < and > characters
  const hasHtmlTags =
    /<[a-zA-Z][^>]*>.*?<\/[a-zA-Z][^>]*>/.test(cleanedContent) ||
    /<[a-zA-Z][^>]*\/>/.test(cleanedContent);

  if (hasHtmlTags) {
    return (
      <div
        className={`prose prose-sm max-w-none ${isUser ? "prose-invert" : ""}`}
      >
        {parse(cleanedContent)}
      </div>
    );
  }

  // Final fallback for completely empty content
  if (!cleanedContent || cleanedContent.trim().length === 0) {
    // If we have original content but cleaned content is empty, show the original
    if (content && content.trim().length > 0) {
      return (
        <div
          className={`prose prose-sm max-w-none ${
            isUser ? "prose-invert" : ""
          }`}
        >
          {parse(content)}
        </div>
      );
    }

    return (
      <div className="text-gray-500 dark:text-gray-400 italic text-sm">
        [Empty response]
      </div>
    );
  }

  // Default to markdown rendering for all other content
  return (
    <div
      className={`prose prose-sm max-w-none ${isUser ? "prose-invert" : ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          // Let CSS variables handle all styling
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          ul: ({ children }) => <ul>{children}</ul>,
          ol: ({ children }) => <ol>{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,
          h4: ({ children }) => <h4>{children}</h4>,
          h5: ({ children }) => <h5>{children}</h5>,
          h6: ({ children }) => <h6>{children}</h6>,
          blockquote: ({ children }) => <blockquote>{children}</blockquote>,
          code: ({ children }) => <code>{children}</code>,
          pre: ({ children }) => {
            // Filter out empty or whitespace-only pre elements
            const content = children?.toString() || "";
            if (!content.trim()) {
              return null;
            }
            return <pre>{children}</pre>;
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors duration-200"
            >
              {children}
            </a>
          ),
          hr: () => <hr />,
          br: () => <br />,
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
    </div>
  );
}
