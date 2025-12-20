import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

// Helper to render text with LaTeX
export const RenderText = ({ text }: { text: string }) => {
    if (!text) return null;
    // Split by $ delimiters to find math parts
    const parts = text.split(/(\$.*?\$)/g);
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('$') && part.endsWith('$')) {
                    // Remove $ delimiters
                    const math = part.slice(1, -1);
                    return <InlineMath key={i} math={math} />;
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};
