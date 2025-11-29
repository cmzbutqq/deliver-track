import { Skeleton } from 'antd'

interface LoadingSkeletonProps {
  rows?: number
}

const LoadingSkeleton = ({ rows = 3 }: LoadingSkeletonProps) => {
  return <Skeleton active paragraph={{ rows }} />
}

export default LoadingSkeleton

