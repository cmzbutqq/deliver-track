-- 配送员自动分配存储过程
-- 参数: order_id
-- 返回: 分配的配送员ID

CREATE OR REPLACE FUNCTION sp_assign_delivery_driver(p_order_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_order RECORD;
  v_driver_id TEXT;
  v_driver RECORD;
BEGIN
  -- 获取订单信息
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '订单不存在: %', p_order_id;
  END IF;

  -- 如果订单已有配送员，直接返回
  IF v_order.delivery_driver_id IS NOT NULL THEN
    RETURN v_order.delivery_driver_id;
  END IF;

  -- 选择配送员策略：
  -- 1. 状态为IDLE（空闲）
  -- 2. 工作量最少（total_orders最小）
  -- 3. 如果工作量相同，选择准时率最高的
  SELECT id INTO v_driver_id
  FROM delivery_drivers
  WHERE status = 'IDLE'
  ORDER BY total_orders ASC, on_time_rate DESC
  LIMIT 1;

  -- 如果没有空闲配送员，选择工作量最少的
  IF v_driver_id IS NULL THEN
    SELECT id INTO v_driver_id
    FROM delivery_drivers
    ORDER BY total_orders ASC, on_time_rate DESC
    LIMIT 1;
  END IF;

  -- 如果找到配送员，更新订单
  IF v_driver_id IS NOT NULL THEN
    UPDATE orders
    SET delivery_driver_id = v_driver_id
    WHERE id = p_order_id;

    -- 更新配送员状态为配送中
    UPDATE delivery_drivers
    SET status = 'DELIVERING'
    WHERE id = v_driver_id;
  END IF;

  RETURN v_driver_id;
END;
$$ LANGUAGE plpgsql;

