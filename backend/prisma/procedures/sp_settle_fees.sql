-- 费用结算存储过程
-- 参数: merchant_id, start_date, end_date
-- 功能：生成结算单，汇总指定时间段内的所有订单费用
-- 返回: 结算单ID和总金额

CREATE OR REPLACE FUNCTION sp_settle_fees(
  p_merchant_id TEXT,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS JSON AS $$
DECLARE
  v_settlement_id TEXT;
  v_settlement_no TEXT;
  v_total_amount DOUBLE PRECISION;
  v_order_count INT;
  v_order RECORD;
BEGIN
  -- 计算总金额和订单数
  SELECT 
    COALESCE(SUM(total_fee), 0),
    COUNT(*)
  INTO v_total_amount, v_order_count
  FROM orders
  WHERE merchant_id = p_merchant_id
    AND status = 'DELIVERED'
    AND created_at >= p_start_date
    AND created_at <= p_end_date
    AND total_fee IS NOT NULL;

  -- 如果没有订单，返回错误
  IF v_order_count = 0 THEN
    RAISE EXCEPTION '指定时间段内没有已完成的订单';
  END IF;

  -- 生成结算单号
  v_settlement_no := 'SETTLE' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- 创建结算单
  INSERT INTO fee_settlements (
    id,
    merchant_id,
    settlement_no,
    start_date,
    end_date,
    total_amount,
    settled_amount,
    status,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid()::text,
    p_merchant_id,
    v_settlement_no,
    p_start_date,
    p_end_date,
    v_total_amount,
    0,
    'PENDING',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_settlement_id;

  -- 创建结算明细
  FOR v_order IN
    SELECT id, total_fee
    FROM orders
    WHERE merchant_id = p_merchant_id
      AND status = 'DELIVERED'
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND total_fee IS NOT NULL
  LOOP
    -- 从delivery_fees表获取费用明细
    INSERT INTO fee_settlement_details (
      id,
      settlement_id,
      order_id,
      fee_type,
      amount,
      created_at
    )
    SELECT
      gen_random_uuid()::text,
      v_settlement_id,
      v_order.id,
      'BASE_FEE',
      COALESCE(base_fee, 0),
      NOW()
    FROM delivery_fees
    WHERE order_id = v_order.id;

    INSERT INTO fee_settlement_details (
      id,
      settlement_id,
      order_id,
      fee_type,
      amount,
      created_at
    )
    SELECT
      gen_random_uuid()::text,
      v_settlement_id,
      v_order.id,
      'DISTANCE_FEE',
      COALESCE(distance_fee, 0),
      NOW()
    FROM delivery_fees
    WHERE order_id = v_order.id;

    INSERT INTO fee_settlement_details (
      id,
      settlement_id,
      order_id,
      fee_type,
      amount,
      created_at
    )
    SELECT
      gen_random_uuid()::text,
      v_settlement_id,
      v_order.id,
      'WEIGHT_FEE',
      COALESCE(weight_fee, 0),
      NOW()
    FROM delivery_fees
    WHERE order_id = v_order.id;

    -- 如果有加急费
    INSERT INTO fee_settlement_details (
      id,
      settlement_id,
      order_id,
      fee_type,
      amount,
      created_at
    )
    SELECT
      gen_random_uuid()::text,
      v_settlement_id,
      v_order.id,
      'URGENT_FEE',
      COALESCE(urgent_fee, 0),
      NOW()
    FROM delivery_fees
    WHERE order_id = v_order.id AND urgent_fee > 0;

    -- 如果有保价费
    INSERT INTO fee_settlement_details (
      id,
      settlement_id,
      order_id,
      fee_type,
      amount,
      created_at
    )
    SELECT
      gen_random_uuid()::text,
      v_settlement_id,
      v_order.id,
      'INSURANCE_FEE',
      COALESCE(insurance_fee, 0),
      NOW()
    FROM delivery_fees
    WHERE order_id = v_order.id AND insurance_fee > 0;
  END LOOP;

  -- 返回结果
  RETURN json_build_object(
    'settlement_id', v_settlement_id,
    'settlement_no', v_settlement_no,
    'total_amount', v_total_amount,
    'order_count', v_order_count
  );
END;
$$ LANGUAGE plpgsql;

