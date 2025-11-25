import { Layout as AntLayout, Menu, Button, Space } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardOutlined, ShoppingOutlined, EnvironmentOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import ThemeSwitch from './ThemeSwitch';

const { Header, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearAuth, merchant } = useAuthStore();

  const menuItems = [
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
      key: '/merchant/zones',
      icon: <EnvironmentOutlined />,
      label: '配送区域',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/merchant/login');
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>物流配送平台</div>
        <Space>
          <span style={{ color: '#fff' }}>{merchant?.name}</span>
          <ThemeSwitch />
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: '#fff' }}>
            退出
          </Button>
        </Space>
      </Header>
      <AntLayout>
        <AntLayout.Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ height: '100%', borderRight: 0 }}
          />
        </AntLayout.Sider>
        <AntLayout style={{ padding: '24px' }}>
          <Content>{children}</Content>
        </AntLayout>
      </AntLayout>
    </AntLayout>
  );
}

