/**
 * Tailwind CSS v4 配置
 * 参考: https://tailwindcss.com/docs/dark-mode#toggling-dark-mode-manually
 *
 * 注意：Tailwind CSS v4 使用 CSS-first 配置方式
 * Vite 插件会自动扫描所有 .vue, .tsx, .jsx 文件提取类名
 * 不再需要手动配置 content 选项
 */
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  theme: {
    extend: {
      fontSize: {
        xs: '0.75rem',
        sm: '0.79rem',
        base: '.8rem',
        lg: '1.25rem',
        xl: '1.5rem',
      },
    },
  },
  plugins: [
    plugin(({ addComponents }) => {
      return addComponents({
        '.no-tailwind-reset': {
          all: 'revert',
          'font-family': 'revert',
          'font-size': 'revert',
          'line-height': 'revert',
          color: 'revert',
          margin: 'revert',
          padding: 'revert',
          border: 'revert',
          'box-sizing': 'revert',
          background: 'revert',
          'background-color': 'revert',
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            'font-size': 'revert',
            'font-weight': 'revert',
            margin: 'revert',
            'line-height': 'revert',
          },
          '& p': {
            margin: 'revert',
          },
          '& ul, & ol': {
            'list-style': 'revert',
            margin: 'revert',
            padding: 'revert',
          },
          '& li': {
            margin: 'revert',
          },
          '& a': {
            color: 'revert',
            'text-decoration': 'revert',
            cursor: 'revert',
          },
          '& a:hover': {
            'text-decoration': 'revert',
          },
          '& table': {
            'border-collapse': 'revert',
            'border-spacing': 'revert',
          },
          '& th, & td': {
            padding: 'revert',
            border: 'revert',
          },
          '& input, & textarea, & select, & button': {
            'font-family': 'revert',
            'font-size': 'revert',
            'line-height': 'revert',
            margin: 'revert',
            padding: 'revert',
            border: 'revert',
            background: 'revert',
            color: 'revert',
          },
          '& button': {
            cursor: 'revert',
          },
          '& blockquote': {
            margin: 'revert',
            padding: 'revert',
            'border-left': 'revert',
          },
          '& pre, & code': {
            'font-family': 'revert',
            'font-size': 'revert',
            background: 'revert',
            padding: 'revert',
            border: 'revert',
          },
          '& hr': {
            border: 'revert',
            margin: 'revert',
          },
          '& img': {
            'max-width': 'revert',
            height: 'revert',
          },
        },
      });
    }),
  ],
} satisfies Config;
