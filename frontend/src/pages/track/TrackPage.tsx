import { useState } from 'react';
import { Input, Button, Card, Typography, App } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

export default function TrackPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [orderNo, setOrderNo] = useState('');

  const handleSearch = () => {
    if (!orderNo.trim()) {
      message.warning('请输入订单号');
      return;
    }
    if (!orderNo.startsWith('ORD') || orderNo.length !== 20) {
      message.warning('订单号格式不正确（应以 ORD 开头，共 20 位）');
      return;
    }
    navigate(`/track/${orderNo}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          物流查询
        </Title>
        <Input
          size="large"
          placeholder="请输入订单号（ORD开头，20位）"
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
          onPressEnter={handleSearch}
          style={{ marginBottom: 16 }}
        />
        <Button type="primary" block size="large" onClick={handleSearch}>
          查询
        </Button>
      </Card>
    </div>
  );
}

