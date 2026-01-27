import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface MarkdownLatexRendererProps {
    content: string;
    className?: string;
}

export function MarkdownLatexRenderer({ content, className = '' }: MarkdownLatexRendererProps) {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    // Customize rendering as needed
                    p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                    em: ({ node, ...props }) => <em className="italic" {...props} />,
                    code: ({ node, inline, ...props }: any) =>
                        inline ? (
                            <code className="px-1 py-0.5 bg-slate-100 rounded text-sm font-mono" {...props} />
                        ) : (
                            <code className="block p-2 bg-slate-100 rounded text-sm font-mono overflow-x-auto" {...props} />
                        ),
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
