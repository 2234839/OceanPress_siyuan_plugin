/**
 * Tailwind CSS v4 配置
 * 参考: https://tailwindcss.com/docs/dark-mode#toggling-dark-mode-manually
 */
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  content: [
    './index.html',
    './src/playground/**/*.{vue,js,ts,jsx,tsx}',
  ],
  // 手动切换深色模式 - 通过 selector 方式
  // 思源笔记使用 html[data-theme-mode="dark"] 来切换
  darkMode: 'selector',
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
