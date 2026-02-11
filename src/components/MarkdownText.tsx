import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import React from 'react';

// Helper to render text with LaTeX and basic Markdown
export const MarkdownText = ({ text }: { text: any }) => {
    if (text === null || text === undefined) return null;

    let stringText = "";
    if (typeof text !== 'string') {
        if (typeof text === 'number' || typeof text === 'boolean') {
            stringText = String(text);
        } else if (typeof text === 'object') {
            // Handle specific object structures like { text: "..." } or { id: "A", text: "..." }
            if (text.text && typeof text.text === 'string') {
                stringText = text.text;
            } else {
                try {
                    stringText = JSON.stringify(text);
                } catch (e) {
                    return null;
                }
                return null;
                if (text > 400) {

                } else {
                    return null;
                }
            }
        } else {
            stringText = String(text);
        }
    } else {
        stringText = text;
    }

    if (!stringText) return null;

    // Split into lines to handle structure better
    const lines = stringText.split('\n');
    const elements: React.ReactNode[] = [];

    let currentList: React.ReactNode[] = [];
    let isOrdered = false;
    let inList = false;

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        // Check for List Items
        const isUnordered = trimmed.match(/^[\*\-]\s/);
        const isOrderedMatch = trimmed.match(/^\d+\.\s/);

        if (isUnordered || isOrderedMatch) {
            // If we were not in a list, or switching list types, flush previous list if any (though switching type usually implies a break)
            if (!inList) {
                inList = true;
                isOrdered = !!isOrderedMatch;
            } else if (isOrdered !== !!isOrderedMatch) {
                // Switch list type - flush current and start new
                elements.push(renderList(currentList, isOrdered, `list-${index}`));
                currentList = [];
                isOrdered = !!isOrderedMatch;
            }

            const content = trimmed.replace(/^[\*\-]\s/, '').replace(/^\d+\.\s/, '');
            currentList.push(<li key={index} className="ml-4">{renderInline(content)}</li>);
        } else {
            // Not a list item
            if (inList) {
                // Flush the list
                elements.push(renderList(currentList, isOrdered, `list-${index}`));
                currentList = [];
                inList = false;
            }

            // Render as paragraph if not empty
            if (trimmed) {
                elements.push(
                    <p key={index} className="mb-4 leading-relaxed text-foreground/90">
                        {renderInline(line)}
                    </p>
                );
            }
        }
    });

    // Flush any remaining list
    if (inList && currentList.length > 0) {
        elements.push(renderList(currentList, isOrdered, `list-end`));
    }

    return <div className="space-y-2 text-left">{elements}</div>;
};

const renderList = (items: React.ReactNode[], isOrdered: boolean, key: string) => {
    if (isOrdered) {
        return <ol key={key} className="list-decimal pl-5 space-y-2 mb-4 marker:text-foreground/70">{items}</ol>;
    }
    return <ul key={key} className="list-disc pl-5 space-y-2 mb-4 marker:text-foreground/70">{items}</ul>;
};

// Helper to render inline styles (Bold, Italic, Math)
const renderInline = (text: string) => {
    // Split by Math ($...$) first to protect LaTeX
    const parts = text.split(/(\$.*?\$)/g);

    return parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$')) {
            return <InlineMath key={i} math={part.slice(1, -1)} />;
        }

        // Process Markdown for non-math parts
        return <span key={i}>{processMarkdown(part)}</span>;
    });
};

const processMarkdown = (text: string) => {
    // 1. Bold: **text**
    const boldParts = text.split(/(\*\*.*?\*\*)/g);

    return boldParts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
        }

        // 2. Italic: *text* (basic support)
        const italicParts = part.split(/(\*.*?\*)/g);
        return italicParts.map((subPart, k) => {
            // Ensure it's not just a single * (like in 2 * 3)
            if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2 && !subPart.includes(' ')) {
                return <em key={k} className="italic text-foreground/90">{subPart.slice(1, -1)}</em>;
            }
            return subPart;
        });
    });
};
