declare module 'react-katex' {
    import * as React from 'react';

    interface KaTeXProps {
        math?: string;
        children?: string;
        block?: boolean;
        errorColor?: string;
        renderError?: (error: any) => React.ReactNode;
        settings?: any;
    }

    export const InlineMath: React.FC<KaTeXProps>;
    export const BlockMath: React.FC<KaTeXProps>;
    const TeX: React.FC<KaTeXProps>;
    export default TeX;
}
