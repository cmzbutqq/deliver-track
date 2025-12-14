-- 订单统计存储过程
-- 参数: merchant_id, start_date, end_date
-- 返回: 统计结果JSON

CREATE OR REPLACE FUNCTION sp_get_order_statistics(
  p_merchant_id TEXT,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
  v_total_count INTEGER;
  v_total_amount DOUBLE PRECISION;
  v_avg_amount DOUBLE PRECISION;
  v_delivered_count INTEGER;
  v_delivered_rate DOUBLE PRECISION;
  v_avg_delivery_time DOUBLE PRECISION; -- 平均配送时长（小时）
  v_result JSON;
BEGIN
  -- 统计订单数量
  SELECT COUNT(*), COALESCE(SUM(amount), 0), COALESCE(AVG(amount), 0)
  INTO v_total_count, v_total_amount, v_avg_amount
  FROM orders
  WHERE merchant_id = p_merchant_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  -- 统计已送达订单数量
  SELECT COUNT(*)
  INTO v_delivered_count
  FROM orders
  WHERE merchant_id = p_merchant_id
    AND status = 'DELIVERED'
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  -- 计算完成率
  IF v_total_count > 0 THEN
    v_delivered_rate := v_delivered_count::DOUBLE PRECISION / v_total_count::DOUBLE PRECISION;
  ELSE
    v_delivered_rate := 0;
  END IF;

  -- 计算平均配送时长（仅统计已送达订单）
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (actual_time - created_at)) / 3600), 0)
  INTO v_avg_delivery_time
  FROM orders
  WHERE merchant_id = p_merchant_id
    AND status = 'DELIVERED'
    AND actual_time IS NOT NULL
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  -- 构建返回JSON
  v_result := json_build_object(
    'merchant_id', p_merchant_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'total_count', v_total_count,
    'total_amount', v_total_amount,
    'avg_amount', v_avg_amount,
    'delivered_count', v_delivered_count,
    'delivered_rate', v_delivered_rate,
    'avg_delivery_time_hours', v_avg_delivery_time
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

