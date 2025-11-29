import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd'
import {
  DashboardOutlined,
  ShoppingOutlined,
  PlusOutlined,
  EnvironmentOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import ThemeSwitch from '@/components/common/ThemeSwitch'
import type { MenuProps } from 'antd'
import './MerchantLayout.css'

const { Header, Sider, Content } = Layout

const MerchantLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const menuItems: MenuProps['items'] = [
    {
      key: '/merchant/dashboard',
      icon: <DashboardOutlined />,
      label: '数据看板',
    },
    {
      key: '/merchant/orders',
      icon: <ShoppingOutlined />,
      label: '订单管理',
    },
    {
      key: '/merchant/orders/new',
      icon: <PlusOutlined />,
      label: '创建订单',
    },
    {
      key: '/merchant/zones',
      icon: <EnvironmentOutlined />,
      label: '配送区域',
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleLogout = () => {
    logout()
    navigate('/merchant/login')
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ]

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      handleLogout()
    }
  }

  return (
    <Layout className="merchant-layout">
      <Sider width={200} className="merchant-sider">
        <div className="logo">物流配送平台</div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className="merchant-header">
          <div className="header-left">
            <span className="merchant-name">{user?.name || user?.username || '商家'}</span>
          </div>
          <div className="header-right">
            <ThemeSwitch />
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
            >
              <Button type="text" icon={<Avatar size="small">{user?.name?.[0] || user?.username?.[0] || 'U'}</Avatar>} />
            </Dropdown>
          </div>
        </Header>
        <Content className="merchant-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MerchantLayout

