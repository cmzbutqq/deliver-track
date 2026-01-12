-- 订单状态更新存储过程
-- 参数: order_id, new_status
-- 功能: 带事务的状态更新，验证状态转换的合法性

CREATE OR REPLACE FUNCTION sp_update_order_status(
  p_order_id TEXT,
  p_new_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_order RECORD;
  v_old_status TEXT;
  v_valid_transition BOOLEAN := FALSE;
BEGIN
  -- 获取订单当前状态
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '订单不存在: %', p_order_id;
  END IF;

  v_old_status := v_order.status::TEXT;

  -- 验证状态转换的合法性（状态机）
  -- PENDING -> SHIPPING, CANCELLED
  -- SHIPPING -> DELIVERED
  -- DELIVERED -> 不允许再变更
  -- CANCELLED -> 不允许再变更
  IF v_old_status = 'PENDING' AND p_new_status IN ('SHIPPING', 'CANCELLED') THEN
    v_valid_transition := TRUE;
  ELSIF v_old_status = 'SHIPPING' AND p_new_status = 'DELIVERED' THEN
    v_valid_transition := TRUE;
  ELSIF v_old_status = p_new_status THEN
    -- 相同状态，允许（幂等操作）
    v_valid_transition := TRUE;
  ELSE
    RAISE EXCEPTION '无效的状态转换: % -> %', v_old_status, p_new_status;
  END IF;

  -- 更新订单状态
  UPDATE orders
  SET status = p_new_status::"OrderStatus",
      updated_at = NOW()
  WHERE id = p_order_id;

  -- 如果状态变为DELIVERED，设置实际送达时间
  IF p_new_status = 'DELIVERED' AND v_order.actual_time IS NULL THEN
    UPDATE orders
    SET actual_time = NOW()
    WHERE id = p_order_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

