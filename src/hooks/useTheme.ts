/**
 * @file hooks/useTheme.ts
 * @description 主题管理 Hook。
 *              读取 localStorage 中的主题偏好或系统偏好色，切换 document 根元素的
 *              light/dark 类名，使 Tailwind CSS 主题变量与 Canvas 渲染同步生效。
 *              被 App.tsx 与 CanvasRenderer 调用。
 */

import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };
} 