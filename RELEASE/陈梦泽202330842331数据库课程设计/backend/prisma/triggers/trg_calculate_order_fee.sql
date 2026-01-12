-- 订单费用计算触发器
-- 功能：当订单创建或更新时，自动计算总费用并更新 delivery_fees 表

-- 创建触发器函数
CREATE OR REPLACE FUNCTION fn_calculate_order_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_base_fee DOUBLE PRECISION;
  v_urgent_fee DOUBLE PRECISION;
  v_insurance_fee DOUBLE PRECISION;
  v_distance_fee DOUBLE PRECISION;
  v_weight_fee DOUBLE PRECISION;
  v_total_fee DOUBLE PRECISION;
BEGIN
  -- 计算各项费用（如果订单有相关字段）
  v_base_fee := COALESCE(10.0, 0); -- 基础运费10元
  v_urgent_fee := COALESCE(NEW.urgent_fee, 0);
  v_insurance_fee := COALESCE(NEW.insurance_amount, 0) * 0.01; -- 保价费 = 保价金额 * 1%
  v_distance_fee := COALESCE(NEW.distance, 0) * 1.5; -- 距离费 = 距离 * 1.5元/km
  v_weight_fee := COALESCE(NEW.weight, 0) * 2; -- 重量费 = 重量 * 2元/kg
  
  -- 计算总费用
  v_total_fee := v_base_fee + v_urgent_fee + v_insurance_fee + v_distance_fee + v_weight_fee;

  -- 更新订单的总费用
  NEW.total_fee := v_total_fee;

  -- 更新或插入 delivery_fees 表
  INSERT INTO delivery_fees (
    id, order_id, base_fee, urgent_fee, insurance_fee, 
    distance_fee, weight_fee, total_fee, created_at, updated_at
  )
  VALUES (
    gen_random_uuid()::text,
    NEW.id,
    v_base_fee,
    v_urgent_fee,
    v_insurance_fee,
    v_distance_fee,
    v_weight_fee,
    v_total_fee,
    NOW(),
    NOW()
  )
  ON CONFLICT (order_id) DO UPDATE SET
    base_fee = EXCLUDED.base_fee,
    urgent_fee = EXCLUDED.urgent_fee,
    insurance_fee = EXCLUDED.insurance_fee,
    distance_fee = EXCLUDED.distance_fee,
    weight_fee = EXCLUDED.weight_fee,
    total_fee = EXCLUDED.total_fee,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（在INSERT和UPDATE时触发）
DROP TRIGGER IF EXISTS trg_calculate_order_fee_insert ON orders;
CREATE TRIGGER trg_calculate_order_fee_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_calculate_order_fee();

DROP TRIGGER IF EXISTS trg_calculate_order_fee_update ON orders;
CREATE TRIGGER trg_calculate_order_fee_update
  BEFORE UPDATE OF urgent_fee, insurance_amount, distance, weight ON orders
  FOR EACH ROW
  WHEN (
    OLD.urgent_fee IS DISTINCT FROM NEW.urgent_fee OR
    OLD.insurance_amount IS DISTINCT FROM NEW.insurance_amount OR
    OLD.distance IS DISTINCT FROM NEW.distance OR
    OLD.weight IS DISTINCT FROM NEW.weight
  )
  EXECUTE FUNCTION fn_calculate_order_fee();

