import { useEffect, useRef, useState } from 'react'
import { Card, Radio, Space } from 'antd'
import * as echarts from 'echarts'
import { ZoneStatistics, LogisticsStatistics } from '@/types'

interface TimeAnalysisChartProps {
  zoneData?: ZoneStatistics[]
  logisticsData?: LogisticsStatistics[]
  mode?: 'orderCount' | 'avgTime'
}

const TimeAnalysisChart = ({ zoneData, logisticsData, mode: initialMode = 'orderCount' }: TimeAnalysisChartProps) => {
  const geoChartRef = useRef<HTMLDivElement>(null)
  const barChartRef = useRef<HTMLDivElement>(null)
  const geoChartInstanceRef = useRef<echarts.ECharts | null>(null)
  const barChartInstanceRef = useRef<echarts.ECharts | null>(null)
  const [mode, setMode] = useState<'orderCount' | 'avgTime'>(initialMode)

  useEffect(() => {
    if (!geoChartRef.current) return

    // 如果已有实例，先销毁
    if (geoChartInstanceRef.current) {
      geoChartInstanceRef.current.dispose()
      geoChartInstanceRef.current = null
    }

    if (!zoneData || zoneData.length === 0) return

    const chart = echarts.init(geoChartRef.current)
    geoChartInstanceRef.current = chart

    // 排序并只显示前15个
    const sortedData = [...zoneData]
      .sort((a, b) => {
        const aValue = mode === 'orderCount' ? a.orderCount : a.avgDeliveryTime
        const bValue = mode === 'orderCount' ? b.orderCount : b.avgDeliveryTime
        return bValue - aValue
      })
      .slice(0, 15)

    const option = {
      title: {
        text: '配送区域统计',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const data = params[0]
          if (mode === 'orderCount') {
            return `${data.name}<br/>订单数: ${data.value}`
          } else {
            return `${data.name}<br/>平均配送时长: ${data.value.toFixed(1)} 小时`
          }
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: sortedData.map((item) => item.zoneName),
        axisLabel: {
          rotate: 45,
          interval: 0,
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value',
        name: mode === 'orderCount' ? '订单数' : '平均配送时长（小时）',
        nameLocation: 'middle',
        nameGap: 50,
      },
      series: [
        {
          name: mode === 'orderCount' ? '订单数' : '平均配送时长',
          data: sortedData.map((item) =>
            mode === 'orderCount' ? item.orderCount : item.avgDeliveryTime
          ),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#2378f7' },
                { offset: 0.7, color: '#2378f7' },
                { offset: 1, color: '#83bff6' },
              ]),
            },
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => {
              if (mode === 'orderCount') {
                return params.value
              } else {
                return params.value.toFixed(1)
              }
            },
          },
        },
      ],
    }

    chart.setOption(option)

    // 响应式调整
    const handleResize = () => {
      chart.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (geoChartInstanceRef.current) {
        geoChartInstanceRef.current.dispose()
        geoChartInstanceRef.current = null
      }
    }
  }, [zoneData, mode])

  useEffect(() => {
    if (!barChartRef.current) return

    // 如果已有实例，先销毁
    if (barChartInstanceRef.current) {
      barChartInstanceRef.current.dispose()
      barChartInstanceRef.current = null
    }

    if (!logisticsData || logisticsData.length === 0) return

    const chart = echarts.init(barChartRef.current)
    barChartInstanceRef.current = chart

    // 根据 mode 排序
    const sortedData = [...logisticsData].sort((a, b) => {
      const aValue = mode === 'orderCount' ? a.orderCount : a.avgDeliveryTime
      const bValue = mode === 'orderCount' ? b.orderCount : b.avgDeliveryTime
      return bValue - aValue
    })

    const option = {
      title: {
        text: '物流公司统计',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const data = params[0]
          const company = sortedData.find((d) => d.companyName === data.name)
          if (mode === 'orderCount') {
            return `${data.name}<br/>订单数: ${data.value}<br/>平均配送时长: ${company?.avgDeliveryTime.toFixed(1) || 0} 小时`
          } else {
            return `${data.name}<br/>平均配送时长: ${data.value.toFixed(1)} 小时<br/>订单数: ${company?.orderCount || 0}`
          }
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '20%', // 增加底部边距，确保 x 轴标签完整显示
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: sortedData.map((item) => item.companyName),
        axisLabel: {
          rotate: 45, // 旋转标签，避免重叠
          interval: 0, // 显示所有标签
          fontSize: 11,
          margin: 8, // 标签与轴线的距离
        },
      },
      yAxis: {
        type: 'value',
        name: mode === 'orderCount' ? '订单数' : '平均配送时长（小时）',
        nameLocation: 'middle',
        nameGap: 50,
      },
      series: [
        {
          name: mode === 'orderCount' ? '订单数' : '平均配送时长',
          data: sortedData.map((item) =>
            mode === 'orderCount' ? item.orderCount : item.avgDeliveryTime
          ),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#91cc75' },
              { offset: 0.5, color: '#73a373' },
              { offset: 1, color: '#73a373' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#5470c6' },
                { offset: 0.7, color: '#5470c6' },
                { offset: 1, color: '#91cc75' },
              ]),
            },
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => {
              if (mode === 'orderCount') {
                return params.value
              } else {
                return `${params.value.toFixed(1)}h`
              }
            },
          },
        },
      ],
    }

    chart.setOption(option)

    // 响应式调整
    const handleResize = () => {
      chart.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.dispose()
        barChartInstanceRef.current = null
      }
    }
  }, [logisticsData, mode])

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Space>
            <span>配送区域统计指标：</span>
            <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} buttonStyle="solid">
              <Radio.Button value="orderCount">订单数</Radio.Button>
              <Radio.Button value="avgTime">平均配送时长</Radio.Button>
            </Radio.Group>
          </Space>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div ref={geoChartRef} style={{ width: '48%', height: '400px', minWidth: '300px' }} />
          <div ref={barChartRef} style={{ width: '48%', height: '400px', minWidth: '300px' }} />
        </div>
      </Card>
    </div>
  )
}

export default TimeAnalysisChart
