import { useState } from 'react'
import { Input, Button, Card, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import './TrackQueryPage.css'

const TrackQueryPage = () => {
  const navigate = useNavigate()
  const [orderNo, setOrderNo] = useState('')

  const handleQuery = () => {
    if (!orderNo.trim()) {
      message.warning('请输入订单号')
      return
    }

    // 验证订单号格式：ORD开头，20位字符
    if (!/^ORD\d{17}$/.test(orderNo.trim())) {
      message.warning('订单号格式不正确，应为ORD开头，共20位字符')
      return
    }

    navigate(`/track/${orderNo.trim()}`)
  }

  return (
    <div className="track-query-container">
      <div className="track-query-background">
        <Card className="track-query-card" title="物流查询">
          <div className="query-form">
            <Input
              size="large"
              placeholder="请输入订单号（ORD开头，20位字符）"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              onPressEnter={handleQuery}
              maxLength={20}
            />
            <Button
              type="primary"
              size="large"
              block
              onClick={handleQuery}
              style={{ marginTop: 16 }}
            >
              查询
            </Button>
            <div className="query-tip">
              提示: 订单号格式为ORD开头，共20位字符
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default TrackQueryPage

