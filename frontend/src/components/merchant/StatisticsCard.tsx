import { Card, Statistic } from 'antd'

interface StatisticsCardProps {
  title: string
  value: number | string
  icon?: React.ReactNode
  loading?: boolean
}

const StatisticsCard = ({ title, value, icon, loading }: StatisticsCardProps) => {
  return (
    <Card>
      <Statistic
        title={title}
        value={value}
        prefix={icon}
        loading={loading}
      />
    </Card>
  )
}

export default StatisticsCard

