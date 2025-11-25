import { Button } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { useThemeStore } from '../stores/themeStore';

export default function ThemeSwitch() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      type="text"
      icon={theme === 'light' ? <BulbOutlined /> : <BulbFilled />}
      onClick={toggleTheme}
      style={{ color: theme === 'light' ? '#000' : '#fff' }}
    >
      {theme === 'light' ? '深色模式' : '浅色模式'}
    </Button>
  );
}

