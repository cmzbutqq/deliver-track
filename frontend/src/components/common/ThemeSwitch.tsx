import { Button } from 'antd'
import { BulbOutlined } from '@ant-design/icons'
import { useThemeStore } from '@/stores/themeStore'

const ThemeSwitch = () => {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <Button
      type="text"
      icon={<BulbOutlined />}
      onClick={toggleTheme}
    >
      {theme === 'light' ? '深色' : '浅色'}
    </Button>
  )
}

export default ThemeSwitch

