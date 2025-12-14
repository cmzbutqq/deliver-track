-- 配送费用计算存储过程
-- 参数: order_id
-- 返回: 费用明细JSON

CREATE OR REPLACE FUNCTION sp_calculate_delivery_fee(p_order_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_base_fee DOUBLE PRECISION;
  v_urgent_fee DOUBLE PRECISION;
  v_insurance_fee DOUBLE PRECISION;
  v_distance_fee DOUBLE PRECISION;
  v_weight_fee DOUBLE PRECISION;
  v_total_fee DOUBLE PRECISION;
  v_result JSON;
BEGIN
  -- 获取订单信息
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '订单不存在: %', p_order_id;
  END IF;

  -- 计算各项费用
  v_base_fee := 10.0; -- 基础运费10元
  v_urgent_fee := COALESCE(v_order.urgent_fee, 0);
  v_insurance_fee := COALESCE(v_order.insurance_amount, 0) * 0.01; -- 保价费 = 保价金额 * 1%
  v_distance_fee := COALESCE(v_order.distance, 0) * 1.5; -- 距离费 = 距离 * 1.5元/km
  v_weight_fee := COALESCE(v_order.weight, 0) * 2; -- 重量费 = 重量 * 2元/kg
  
  -- 计算总费用
  v_total_fee := v_base_fee + v_urgent_fee + v_insurance_fee + v_distance_fee + v_weight_fee;

  -- 构建返回JSON
  v_result := json_build_object(
    'order_id', p_order_id,
    'base_fee', v_base_fee,
    'urgent_fee', v_urgent_fee,
    'insurance_fee', v_insurance_fee,
    'distance_fee', v_distance_fee,
    'weight_fee', v_weight_fee,
    'total_fee', v_total_fee
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

